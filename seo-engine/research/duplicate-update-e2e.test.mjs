import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { runResearchPipeline } from "./pipeline.mjs";

const now = new Date("2026-11-21T10:00:00.000Z");
const publicContentDir = path.resolve("content/blog");
const targetSlug = "best-accounting-software-for-small-business";
const targetUrl = `https://www.finflowtrack.com/blog/${targetSlug}`;

function mockSoftwareSelectionFetch(url) {
  const address = String(url);
  const pages = [
    ["waveapps.com", "<title>Wave Pricing</title><body>STARTER Plan $0 Create unlimited estimates invoices bills and bookkeeping records. Online payments include 2.9% + $0.60 per credit card transaction. Pro plan adds auto-import bank transactions and digitally capture unlimited receipts.</body>"],
    ["zoho.com", "<title>Zoho Books US Pricing</title><body>FREE $0 create invoices expenses journals P&L Balance Sheet and reports. 1 User + 1 Accountant.</body>"],
    ["zipbooks.com", "<title>ZipBooks Pricing</title><body>Starter Free. Send unlimited invoices. Manage unlimited vendors and customers. View Basic Reports. Connect 1 bank account.</body>"],
    ["irs.gov", "<title>What kind of records should I keep</title><body>Keep business records that clearly show income and expenses. Supporting documents include invoices, receipts and bank records.</body>"],
  ];
  const found = pages.find(([domain]) => address.includes(domain));
  return Promise.resolve(new Response(found?.[1] || "<html><body>not found</body></html>", {
    status: 200,
    headers: { "content-type": "text/html" },
  }));
}

test("end-to-end duplicate match creates an unpublished update draft for the real public article", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "finflow-duplicate-update-e2e-"));
  try {
    const result = await runResearchPipeline({
      opportunities: [{
        id: "acceptance-real-public-article-duplicate",
        targetUrl,
        targetQuery: "best accounting software for small business",
        metrics: { impressions: 120, clicks: 4, ctr: 4 / 120, averagePosition: 14.2 },
        reportingPeriodEnd: "2026-11-20",
        dataSource: "TEST_FIXTURE",
        evidenceMode: "FIXTURE",
      }],
      contentDir: publicContentDir,
      outputDir,
      fetchImpl: mockSoftwareSelectionFetch,
      now,
      store: null,
      allowFixture: true,
      articleGenerator: null,
    });

    assert.equal(result.results.length, 1);
    const item = result.results[0];

    assert.equal(item.cannibalization.decision, "UPDATE_EXISTING_ARTICLE");
    assert.equal(item.editorialUpdateProposal.action, "UPDATE_EXISTING_PUBLIC_ARTICLE");
    assert.equal(item.editorialUpdateProposal.targetSlug, targetSlug);
    assert.equal(item.editorialUpdateProposal.targetUrl, targetUrl);
    assert.equal(item.editorialUpdateProposal.matchType, "EXACT_GSC_LANDING_PAGE");
    assert.ok(item.editorialUpdateProposal.recommendedActions.some(action => action.includes("Keep the existing public URL")));

    assert.ok(item.draft, "The research pipeline must produce an update draft.");
    assert.equal(item.draft.operationType, "EXISTING_ARTICLE_UPDATE");
    assert.equal(item.draft.slug, targetSlug);
    assert.equal(item.draft.canonicalUrl, targetUrl);
    assert.equal(item.draft.status, "draft");
    assert.equal(item.draft.publicationStatus, "draft");

    const draftMarkdown = await readFile(item.draftPath, "utf8");
    const parsedDraft = matter(draftMarkdown);
    const originalMarkdown = await readFile(path.join(publicContentDir, `${targetSlug}.md`), "utf8");
    const originalBody = matter(originalMarkdown).content;

    assert.equal(parsedDraft.data.slug, targetSlug);
    assert.equal(parsedDraft.data.draft, true);
    assert.equal(parsedDraft.data.status, "draft");
    assert.equal(parsedDraft.data.publicationStatus, "draft");
    assert.match(parsedDraft.content, /## Free Accounting Software Options: A Practical Comparison/);
    assert.ok(parsedDraft.content.includes("Choosing accounting software is not simply about finding the platform with the longest feature list."));
    assert.ok(parsedDraft.content.includes("The best choice depends on how the business operates."));
    assert.ok(originalBody.includes("Choosing accounting software is not simply about finding the platform with the longest feature list."));
    assert.equal(item.persistence, "LOCAL_DRY_RUN_ONLY");
    assert.equal(result.readyDraftCount, 0, "Synthetic GSC evidence must never become approval-ready.");
    assert.equal(result.persistedDraftCount, 0);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
