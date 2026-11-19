import test from "node:test";
import assert from "node:assert/strict";
import { aggregatePageQueries, scorePage } from "./search-intelligence.mjs";

test("aggregates daily GSC page-query rows over the reporting period", () => {
  const rows = aggregatePageQueries([
    { page: "https://www.finflowtrack.com/blog/cash-flow", query: "cash flow forecast", clicks: 2, impressions: 20, ctr: 0.1, position: 8 },
    { page: "https://www.finflowtrack.com/blog/cash-flow", query: "cash flow forecast", clicks: 3, impressions: 30, ctr: 0.1, position: 12 },
    { page: "https://www.finflowtrack.com/blog/cash-flow", query: "invoice tracking", clicks: 1, impressions: 10, ctr: 0.1, position: 5 },
  ]);
  assert.equal(rows.length, 2);
  const cashFlow = rows.find(row => row.query === "cash flow forecast");
  assert.equal(cashFlow.clicks, 5);
  assert.equal(cashFlow.impressions, 50);
  assert.equal(cashFlow.ctr, 0.1);
  assert.equal(cashFlow.position, 10.4);
});

test("scores complete GSC metrics and records the source collection timestamp", () => {
  const result = scorePage({
    page: "https://www.finflowtrack.com/blog/cash-flow", clicks: 5, impressions: 50,
    ctr: 0.1, position: 10.4, dateRange: { startDate: "2026-11-01", endDate: "2026-11-15" },
    sourceCollectionAt: "2026-11-16T00:00:00.000Z",
  }, [{ page: "https://www.finflowtrack.com/blog/cash-flow", query: "cash flow forecast", clicks: 5, impressions: 50, ctr: 0.1, position: 10.4 }]);
  assert.equal(result.decision, "REVIEW_REQUIRED");
  assert.equal(result.evidence.sourceCollectionAt, "2026-11-16T00:00:00.000Z");
  assert.equal(result.evidence.sampleQueries[0].impressions, 50);
});

test("incomplete GSC metrics never become a reviewable opportunity", () => {
  const result = scorePage({
    page: "https://www.finflowtrack.com/blog/cash-flow", clicks: null, impressions: 0, ctr: null, position: null,
  }, []);
  assert.equal(result.decision, "LOW_EVIDENCE");
  assert.equal(result.confidence, 0);
});
