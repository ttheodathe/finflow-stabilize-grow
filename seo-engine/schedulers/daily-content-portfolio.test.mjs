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
    targetQuery: query,
    targetUrl,
    metrics: { impressions, clicks, ctr: clicks / impressions, averagePosition: 12 },
  };
}

test("selects at most one new article and one exact-intent existing article update", () => {
  const result = selectDailyContentPortfolio([
    candidate("update-1", "small business bookkeeping records checklist", "https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist", 250, 4),
    candidate("update-2", "cash flow forecasting for small business", "https://www.finflowtrack.com/blog/cash-flow-forecasting-small-business", 500, 10),
    candidate("new-1", "inventory turnover calculation for small retailers", "https://www.finflowtrack.com/", 300, 3),
    candidate("new-2", "cash runway planning for early stage startups", "https://www.finflowtrack.com/", 150, 2),
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
