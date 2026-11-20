import test from "node:test";
import assert from "node:assert/strict";
import { selectDailyContentPortfolio } from "./daily-content-portfolio.mjs";

const inventory = [
  {
    slug: "small-business-bookkeeping-checklist",
    title: "Small Business Bookkeeping Checklist",
    description: "Bookkeeping records and receipts",
    tags: ["bookkeeping", "records"],
    content: "A practical guide to bookkeeping records, invoices, receipts and monthly account review.",
  },
  {
    slug: "cash-flow-forecasting-small-business",
    title: "Cash Flow Forecasting for Small Business",
    description: "Build and review a small business cash flow forecast.",
    tags: ["cash flow", "forecast"],
    content: "A guide to cash flow forecasting and cash management.",
  },
];

function candidate(id, query, targetUrl, impressions = 100, clicks = 5) {
  return {
    id,
    reportingPeriodEnd: new Date().toISOString().slice(0, 10),
    dataSource: "Google Search Console",
    evidenceMode: "LIVE_OR_PERSISTED",
    targetQuery: query,
    targetUrl,
    metrics: { impressions, clicks, ctr: clicks / impressions, averagePosition: 12 },
  };
}

test("selects at most one new article and one exact-intent existing article update", () => {
  const result = selectDailyContentPortfolio([
    candidate("update-1", "small business bookkeeping records checklist", "https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist", 250, 4),
    candidate("update-2", "build a cash flow forecast for a small business", "https://www.finflowtrack.com/blog/cash-flow-forecasting-small-business", 500, 10),
    candidate("new-1", "how to follow up unpaid invoices with customers", "https://www.finflowtrack.com/", 300, 3),
    candidate("new-2", "how to manage overdue customer invoices", "https://www.finflowtrack.com/", 150, 2),
  ], inventory);

  assert.equal(result.selectedCandidateCount, 2);
  assert.equal(result.slots.newArticle.status, "SELECTED");
  assert.equal(result.slots.articleUpdate.status, "SELECTED");
  assert.equal(result.slots.newArticle.candidateId, "new-1");
  assert.equal(result.slots.articleUpdate.candidateId, "update-2");
  assert.deepEqual(result.selectedCandidates.map(item => item.dailyPortfolioSlot), [
    "NEW_ARTICLE",
    "UPDATE_EXISTING_ARTICLE",
  ]);
});

test("leaves a daily slot unfilled rather than inventing an unsupported opportunity", () => {
  const result = selectDailyContentPortfolio([
    candidate("update-only", "small business bookkeeping records checklist", "https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist"),
  ], inventory);

  assert.equal(result.selectedCandidateCount, 1);
  assert.equal(result.slots.articleUpdate.status, "SELECTED");
  assert.equal(result.slots.newArticle.status, "UNFILLED_NO_QUALIFIED_CANDIDATE");
});

test("excludes fixture and incomplete GSC rows from both daily slots", () => {
  const fixture = { ...candidate("fixture", "inventory turnover calculation for small retailers", "https://www.finflowtrack.com/"), evidenceMode: "FIXTURE" };
  const incomplete = { ...candidate("incomplete", "inventory turnover calculation for small retailers", "https://www.finflowtrack.com/"), metrics: { impressions: 20, clicks: null, ctr: null, averagePosition: 10 } };
  const result = selectDailyContentPortfolio([fixture, incomplete], inventory);

  assert.equal(result.selectedCandidateCount, 0);
  assert.equal(result.slots.newArticle.status, "UNFILLED_NO_QUALIFIED_CANDIDATE");
  assert.equal(result.slots.articleUpdate.status, "UNFILLED_NO_QUALIFIED_CANDIDATE");
  assert.equal(result.evaluatedCandidateCount, 0);
});
