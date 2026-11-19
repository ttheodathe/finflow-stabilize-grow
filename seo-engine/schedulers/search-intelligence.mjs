import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collect } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

function clamp(value) { return Math.max(0, Math.min(5, value)); }
function scorePage(page, queries) {
  const impressions = page.impressions || 0;
  const ctr = page.ctr || 0;
  const position = page.position || 0;
  const queryRows = queries.filter((row) => row.page === page.page);
  const relevant = queryRows.filter((row) => /account|invoice|expense|bookkeep|cash flow|receivable|payable|freelanc|small business/i.test(row.query || ""));
  const intentFit = relevant.length > 0 ? 4 : 1;
  const gscOpportunity = clamp(Math.log10(impressions + 1) * 1.5);
  const ctrOpportunity = clamp(ctr < 0.02 && impressions >= 20 ? 4 : ctr < 0.05 ? 3 : 1);
  const positionOpportunity = clamp(position >= 4 && position <= 20 ? 4 : position > 20 && position <= 40 ? 2 : position > 0 ? 1 : 0);
  const productFit = relevant.length ? 4 : 1;
  const effort = 3;
  const confidence = impressions >= 50 ? 4 : impressions >= 10 ? 3 : 1;
  const score = Math.round(((gscOpportunity + ctrOpportunity + positionOpportunity + intentFit + productFit + effort + confidence) / 35) * 100);
  return {
    id: `gsc-${Buffer.from(page.page).toString("base64url").slice(0, 24)}`,
    targetUrl: page.page,
    action: "REVIEW_EXISTING_PAGE",
    score,
    confidence: confidence / 5,
    evidence: {
      source: "Google Search Console",
      dateRange: page.dateRange || null,
      clicks: page.clicks,
      impressions,
      ctr,
      averagePosition: position,
      relevantQueryCount: relevant.length,
      sampleQueries: relevant.slice(0, 10).map((row) => ({ query: row.query, clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position })),
    },
    scoring: { gscOpportunity, ctrOpportunity, positionOpportunity, intentFit, productFit, effort, confidence },
    decision: impressions >= 10 && relevant.length > 0 ? "REVIEW_REQUIRED" : "LOW_EVIDENCE",
    createdAt: new Date().toISOString(),
  };
}

export async function runSearchIntelligence({ dateRange = resolveDateRange(), collectFn = collect } = {}) {
  await mkdir(OUTPUT, { recursive: true });
  const result = await collectFn({ dateRange, outputDir: OUTPUT });
  const snapshot = JSON.parse(await readFile(result.file, "utf8"));
  const pages = new Map();
  for (const row of snapshot.gsc.pages) {
    const current = pages.get(row.page) || { page: row.page, clicks: 0, impressions: 0, ctr: 0, position: 0, rows: 0 };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.position += row.position;
    current.rows += 1;
    pages.set(row.page, current);
  }
  const queries = snapshot.gsc.pageQueries;
  const opportunities = [...pages.values()].map((page) => {
    page.ctr = page.impressions ? page.clicks / page.impressions : 0;
    page.position = page.rows ? page.position / page.rows : 0;
    return scorePage({ ...page, dateRange }, queries);
  }).sort((a, b) => b.score - a.score);
  const report = {
    schemaVersion: 1, scheduler: "SEARCH_INTELLIGENCE",
    generatedAt: new Date().toISOString(), dateRange,
    sourceFile: result.file, opportunityCount: opportunities.length,
    limitations: ["GSC average position is an aggregate, not a fixed rank.", "Search volume and competitor difficulty are not inferred.", "Opportunities are recommendations, not publishing authorization."],
    opportunities,
  };
  const path = `${OUTPUT}/scheduler-1-opportunities.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  return { path, opportunityCount: opportunities.length, dateRange };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runSearchIntelligence(), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 1 failed: ${error.message}`); process.exitCode = 1; }
}
