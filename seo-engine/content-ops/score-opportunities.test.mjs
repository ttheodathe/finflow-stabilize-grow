import test from "node:test";
import assert from "node:assert/strict";
import { buildDryRunReport, scoreOpportunity } from "./score-opportunities.mjs";

const completeOpportunity = {
  id: "cash-flow-forecasting",
  topic: "Cash flow forecasting for small businesses",
  searchIntent: "Informational: learn how to prepare a cash flow forecast",
  editorialOwner: "Editorial review required",
  evidence: [{
    sourceUrl: "https://www.sba.gov/",
    sourceType: "government",
    verifiedAt: "2026-11-19",
    supports: "General small-business planning context",
  }],
  cannibalization: { status: "not_detected" },
  scores: {
    gscOpportunity: 4,
    searchIntent: 5,
    productFit: 4,
    commercialRelevance: 3,
    uniqueness: 4,
    topicalAuthority: 4,
    cannibalizationSafety: 5,
    researchConfidence: 4,
    conversionPotential: 3,
  },
};

test("scores a complete opportunity on a 100-point scale", () => {
  const result = scoreOpportunity(completeOpportunity);
  assert.equal(result.scoreMaximum, 100);
  assert.ok(result.score > 0 && result.score <= 100);
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.deepEqual(result.hardStops, []);
});

test("blocks missing evidence and unclear intent", () => {
  const result = scoreOpportunity({
    ...completeOpportunity,
    evidence: [],
    searchIntent: "",
  });
  assert.equal(result.decision, "BLOCKED");
  assert.ok(result.hardStops.includes("MISSING_SOURCE_EVIDENCE"));
  assert.ok(result.hardStops.includes("UNCLEAR_SEARCH_INTENT"));
});

test("blocks confirmed cannibalization and preserves the affected URL", () => {
  const result = scoreOpportunity({
    ...completeOpportunity,
    cannibalization: {
      status: "confirmed_conflict",
      existingUrl: "https://www.finflowtrack.com/blog/example",
    },
  });
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.existingUrl, "https://www.finflowtrack.com/blog/example");
});

test("rejects scores outside the documented scale", () => {
  assert.throws(() => scoreOpportunity({
    ...completeOpportunity,
    scores: { ...completeOpportunity.scores, productFit: 6 },
  }), /0 to 5/);
});

test("report sorts by score and explicitly remains dry-run", () => {
  const report = buildDryRunReport({
    opportunities: [
      { ...completeOpportunity, id: "lower", scores: { ...completeOpportunity.scores, gscOpportunity: 1 } },
      { ...completeOpportunity, id: "higher" },
    ],
  });
  assert.equal(report.mode, "dry-run");
  assert.equal(report.count, 2);
  assert.equal(report.results[0].id, "higher");
  assert.match(report.note, /No content was published or modified/);
});

test("rejects malformed top-level input", () => {
  assert.throws(() => buildDryRunReport({}), /opportunities array/);
});
