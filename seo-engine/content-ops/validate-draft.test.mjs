import test from "node:test";
import assert from "node:assert/strict";
import { validateDraft } from "./validate-draft.mjs";

const validDraft = {
  title: "A practical guide to cash flow",
  description: "Learn the basics of cash flow planning.",
  slug: "cash-flow-planning-guide",
  author: "FinFlow Track Editorial",
  publishedAt: "2026-11-19",
  canonicalUrl: "https://www.finflowtrack.com/blog/cash-flow-planning-guide",
  editorialReviewed: false,
  evidence: [{
    sourceUrl: "https://www.sba.gov/",
    sourceType: "government",
    verifiedAt: "2026-11-19",
    supports: "General small business planning context",
  }],
  claims: [{
    text: "FinFlow Track supports expense tracking.",
    type: "product",
    capability: "Expense tracking",
    sourceUrls: ["https://www.sba.gov/"],
  }],
};

test("valid metadata and registered sources pass deterministic hard gates", () => {
  const result = validateDraft(validDraft);
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.includes("EDITORIAL_REVIEW_NOT_COMPLETED"));
});

test("blocks product capabilities outside the verified allowlist", () => {
  const result = validateDraft({
    ...validDraft,
    claims: [{
      text: "The product provides payroll.",
      type: "product",
      capability: "Free payroll",
      sourceUrls: ["https://www.sba.gov/"],
    }],
  });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.errors.includes("UNVERIFIED_PRODUCT_CAPABILITY"));
});

test("blocks claims without a source in the evidence register", () => {
  const result = validateDraft({
    ...validDraft,
    claims: [{
      text: "An unsourced claim",
      sourceUrls: ["https://example.com/"],
    }],
  });
  assert.ok(result.errors.includes("CLAIM_SOURCE_NOT_IN_REGISTER"));
});

test("blocks missing metadata and malformed slugs", () => {
  const result = validateDraft({ ...validDraft, title: "", slug: "Bad Slug" });
  assert.ok(result.errors.includes("MISSING_METADATA:title"));
  assert.ok(result.errors.includes("INVALID_SLUG"));
});

test("blocks absent evidence", () => {
  const result = validateDraft({ ...validDraft, evidence: [] });
  assert.ok(result.errors.includes("NO_SOURCE_EVIDENCE"));
});
