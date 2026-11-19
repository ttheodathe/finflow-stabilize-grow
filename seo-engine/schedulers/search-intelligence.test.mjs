import test from "node:test";
import assert from "node:assert/strict";
import { aggregatePageQueries, scorePage, buildOpportunityKey } from "./search-intelligence.mjs";

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

test("GSC aggregation preserves missing metrics as null rather than verified zero", () => {
  const rows = aggregatePageQueries([
    { page: "https://www.finflowtrack.com/blog/accounting", query: "accounting apps", clicks: null, impressions: 12, ctr: null, position: 9 },
    { page: "https://www.finflowtrack.com/blog/accounting", query: "accounting apps", clicks: 0, impressions: 8, ctr: 0, position: 11 },
  ]);
  assert.equal(rows[0].clicks, null);
  assert.equal(rows[0].impressions, 20);
  assert.equal(rows[0].ctr, null);
  assert.equal(rows[0].position, 9.8);
  const scored = scorePage({
    page: "https://www.finflowtrack.com/blog/accounting",
    clicks: null, impressions: 20, ctr: null, position: 10.2,
  }, rows);
  assert.equal(scored.evidence.clicks, null);
  assert.equal(scored.evidence.ctr, null);
  assert.equal(scored.confidence, 0);
  assert.equal(scored.decision, "LOW_EVIDENCE");
});

test("opportunity idempotency keys are stable within a run and isolated across runs", () => {
  const firstRun = "00000000-0000-4000-8000-000000000001";
  const retryRun = "00000000-0000-4000-8000-000000000002";
  assert.equal(
    buildOpportunityKey(firstRun, "gsc-page-1", "2026-11-15"),
    buildOpportunityKey(firstRun, "gsc-page-1", "2026-11-15"),
  );
  assert.notEqual(
    buildOpportunityKey(firstRun, "gsc-page-1", "2026-11-15"),
    buildOpportunityKey(retryRun, "gsc-page-1", "2026-11-15"),
  );
});

test("incomplete metrics are explicitly marked in opportunity provenance", () => {
  const result = scorePage({
    page:"https://www.finflowtrack.com/blog/metrics",clicks:null,impressions:25,ctr:null,position:9.4,
  },[]);
  assert.equal(result.evidence.metricCompleteness,"INCOMPLETE");
  assert.equal(result.evidence.clicks,null);
  assert.equal(result.evidence.ctr,null);
});
