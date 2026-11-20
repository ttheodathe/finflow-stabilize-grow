import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createEditorialBrief, createHumanApproval, verifyHumanApproval, runArticleProduction,
} from "./article-production.mjs";

const source = {
  url: "https://www.sba.gov/business-guide/manage-your-business/manage-your-finances",
  finalUrl: "https://www.sba.gov/business-guide/manage-your-business/manage-your-finances",
  sourceTitle: "Manage your finances", publisher: "US Small Business Administration",
  status: "RETRIEVED_RELEVANT",
  verificationStatus: "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED",
  retrievedAt: "2026-11-20T10:00:00.000Z",
  supportedClaims: ["Maintain accurate business financial records."],
  limitations: ["United States government guidance."],
};
const research = {
  candidate: { targetQuery: "small business cash flow planning", relatedQueries: ["cash flow forecast"] },
  intent: "How-to/tutorial",
  audience: "Small-business owners and freelancers",
  articleAngle: "A practical cash-flow planning workflow grounded in official guidance.",
  outline: ["Understand cash flow", "Prepare a forecast", "Review assumptions"],
  readerQuestions: ["What is cash flow planning?", "How can a small business prepare a forecast?"],
  sourceRecords: [source],
  internalLinks: [{ slug: "small-business-accounting-guide", title: "Small Business Accounting Guide" }],
  draft: {
    title: "Small Business Cash Flow Planning",
    description: "A practical guide to planning and reviewing small-business cash flow.",
    slug: "small-business-cash-flow-planning",
    status: "draft", publicationStatus: "draft",
    canonicalUrl: "https://www.finflowtrack.com/blog/small-business-cash-flow-planning",
    operationType: "NEW_ARTICLE",
    claims: [{
      text: "Maintain accurate business financial records.",
      sourceUrls: [source.url],
      verificationStatus: "KEYWORD_RELEVANCE_PASS_HUMAN_REVIEW_REQUIRED",
    }],
  },
};

test("editorial brief contains search intent, audience, evidence, internal links and human-review policy", () => {
  const brief = createEditorialBrief(research);
  assert.equal(brief.targetQuery, "small business cash flow planning");
  assert.equal(brief.searchIntent, "How-to/tutorial");
  assert.equal(brief.evidence.length, 1);
  assert.equal(brief.internalLinks[0].slug, "small-business-accounting-guide");
  assert.match(brief.publicationPolicy, /Human review/);
});

test("article generation fails closed when no provider is configured", async () => {
  const result = await runArticleProduction({ research });
  assert.equal(result.status, "BLOCKED_GENERATOR_NOT_CONFIGURED");
});

test("article production blocks incomplete evidence before calling generator", async () => {
  let called = false;
  const result = await runArticleProduction({
    research: { ...research, sourceRecords: [{ ...source, status: "UNAVAILABLE" }] },
    generateArticle: async () => { called = true; return { markdown: "not used" }; },
  });
  assert.equal(result.status, "BLOCKED_EVIDENCE_INCOMPLETE");
  assert.equal(called, false);
});

test("article production writes a revision-hashed draft package outside the public blog and never publishes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "stage-c-"));
  try {
    const body = [
      "## Understand the cash position",
      "Review expected receipts and planned payments for the period.",
      "## Prepare a forecast",
      "List assumptions, dates and amounts, then compare expected cash movement.",
      "## Review and update",
      "Compare actual results with the forecast and explain material differences.",
      "## Related guide",
      "[Small Business Accounting Guide](/blog/small-business-accounting-guide)",
    ].join("\n\n");
    const markdown = [
      "---",
      'title: "Small Business Cash Flow Planning"',
      'description: "A practical guide to planning and reviewing small-business cash flow."',
      'slug: "small-business-cash-flow-planning"',
      'status: "draft"',
      'publicationStatus: "draft"',
      "---",
      "",
      body,
      "",
    ].join("\n");
    const result = await runArticleProduction({
      research, outputDir: root, minWordCount: 10,
      generateArticle: async ({ brief }) => {
        assert.equal(brief.targetQuery, "small business cash flow planning");
        return { markdown };
      },
    });
    assert.equal(result.status, "READY_FOR_HUMAN_REVIEW");
    assert.equal(result.publication.publishEnabled, false);
    assert.equal(result.publication.productionWriteAllowed, false);
    assert.equal(result.quality.internalLinkFailures.length, 0);
    assert.match(result.articlePath, /stage-c-/);
    assert.doesNotMatch(result.articlePath, /content[\/]blog/);
    const saved = await readFile(result.articlePath, "utf8");
    assert.equal(saved, markdown.trim() + "\n");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("human approval is cryptographically bound to one exact content hash", () => {
  const content = "# Approved article\n";
  const approval = createHumanApproval({
    content, reviewerId: "editor-1", approvedAt: "2026-11-20T12:00:00.000Z",
  });
  assert.equal(verifyHumanApproval({ content, approval }), true);
  assert.equal(verifyHumanApproval({ content: content + "changed", approval }), false);
  assert.equal(verifyHumanApproval({ content, approval: { ...approval, decision: "PENDING" } }), false);
  assert.throws(() => createHumanApproval({ content, reviewerId: "", approvedAt: "2026-11-20" }), /reviewer identifier/);
});
