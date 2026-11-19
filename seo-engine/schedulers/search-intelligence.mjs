import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collect } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

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

function extractMeta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((item) => new RegExp(`\\bname=["']${name}["']`, "i").test(item));
  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1] || null;
}

export async function checkTechnicalUrls(urls, { fetchImpl = fetch, maxPages = 40 } = {}) {
  const base = "https://www.finflowtrack.com";
  let sitemapText = null;
  let sitemapStatus = null;
  try {
    const sitemap = await fetchImpl(`${base}/sitemap.xml`, { redirect: "follow" });
    sitemapStatus = sitemap.status;
    if (sitemap.ok) sitemapText = await sitemap.text();
  } catch { /* Failed external checks are not classified as confirmed defects. */ }

  const checks = [];
  for (const rawUrl of urls.slice(0, maxPages)) {
    let url;
    try { url = new URL(rawUrl); } catch {
      checks.push({ url: rawUrl, checkStatus: "INVALID_URL", confirmedIssues: ["INVALID_URL"] });
      continue;
    }
    if (!["finflowtrack.com", "www.finflowtrack.com"].includes(url.hostname)) {
      checks.push({ url: rawUrl, checkStatus: "SKIPPED_EXTERNAL_HOST", confirmedIssues: [] });
      continue;
    }
    try {
      const response = await fetchImpl(url.toString(), { redirect: "follow" });
      const html = response.ok ? await response.text() : "";
      const finalUrl = response.url || url.toString();
      const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1]
        || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
        || null;
      const titlePresent = /<title[^>]*>[^<]+<\/title>/i.test(html);
      const descriptionPresent = Boolean(extractMeta(html, "description"));
      const robots = extractMeta(html, "robots") || "";
      const xRobots = response.headers?.get?.("x-robots-tag") || "";
      const noindex = /noindex/i.test(robots) || /noindex/i.test(xRobots);
      const issues = [];
      if (response.status >= 400) issues.push("HTTP_ERROR");
      if (noindex) issues.push("NOINDEX");
      if (canonical && canonical !== finalUrl) issues.push("CANONICAL_MISMATCH");
      if (!canonical) issues.push("MISSING_CANONICAL");
      if (!titlePresent) issues.push("MISSING_TITLE");
      if (!descriptionPresent) issues.push("MISSING_META_DESCRIPTION");
      if (sitemapText && !sitemapText.includes(finalUrl)) issues.push("NOT_IN_SITEMAP");
      checks.push({
        url: url.toString(), finalUrl, httpStatus: response.status,
        canonical, indexable: !noindex, titlePresent, descriptionPresent,
        sitemapChecked: sitemapText !== null, sitemapStatus,
        checkStatus: "COMPLETED", confirmedIssues: issues,
      });
    } catch (error) {
      checks.push({ url: url.toString(), checkStatus: "EXTERNAL_CHECK_FAILED", confirmedIssues: [], error: String(error.message || error) });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    checkedCount: checks.length,
    confirmedIssueCount: checks.reduce((sum, item) => sum + item.confirmedIssues.length, 0),
    checks,
  };
}

export async function runSearchIntelligence({ dateRange = resolveDateRange(), collectFn = collect, fetchImpl = fetch } = {}) {
  await mkdir(OUTPUT, { recursive: true });
  const result = await collectFn({ dateRange, outputDir: OUTPUT });
  const snapshot = JSON.parse(await readFile(result.file, "utf8"));
  const pages = new Map();
  for (const row of snapshot.gsc.pages) {
    const current = pages.get(row.page) || {
      page: row.page, clicks: 0, impressions: 0, ctr: 0,
      positionWeighted: 0, positionImpressions: 0,
    };
    current.clicks += row.clicks;
    current.impressions += row.impressions;
    current.positionWeighted += row.position * row.impressions;
    current.positionImpressions += row.impressions;
    pages.set(row.page, current);
  }
  const queries = snapshot.gsc.pageQueries;
  const pageValues = [...pages.values()];
  const opportunities = pageValues.map((page) => {
    page.ctr = page.impressions ? page.clicks / page.impressions : 0;
    page.position = page.positionImpressions ? page.positionWeighted / page.positionImpressions : 0;
    return scorePage({ ...page, dateRange }, queries);
  }).sort((a, b) => b.score - a.score);
  const technical = await checkTechnicalUrls(
    [...pageValues].sort((a, b) => b.impressions - a.impressions).map((page) => page.page),
    { fetchImpl },
  );
  const store = createSupabaseSeoStoreFromEnv(process.env, { fetchImpl });
  let persistence = { status: "NOT_CONFIGURED", schedulerRunId: null, opportunityRecords: 0 };
  let persistenceError = null;
  if (!store && process.env.SEO_PERSISTENCE_REQUIRED === "true") {
    persistenceError = new Error("Supabase SEO persistence is required but its server-side credentials are not configured.");
    persistence = { ...persistence, status: "FAILED", error: persistenceError.message };
  }
  if (store) {
    let schedulerRunId = null;
    try {
      const scheduledFor = new Date().toISOString().slice(0, 10);
      schedulerRunId = await store.recordRun({
        schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor, attempt: 1,
        status: "RUNNING", output: { dateRange },
      });
      for (const opportunity of opportunities) {
        await store.recordOpportunity({
          opportunityKey: `${opportunity.id}:${dateRange.endDate}`,
          schedulerRunId,
          targetUrl: opportunity.targetUrl,
          queryText: opportunity.evidence?.sampleQueries?.[0]?.query || null,
          opportunityType: opportunity.action,
          score: opportunity.score,
          evidence: { ...opportunity.evidence, scoring: opportunity.scoring, decision: opportunity.decision },
        });
      }
      await store.recordRun({
        schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor, attempt: 1,
        status: "SUCCEEDED",
        output: { opportunityCount: opportunities.length, technicalIssueCount: technical.confirmedIssueCount, dateRange },
      });
      persistence = { status: "PERSISTED", schedulerRunId, opportunityRecords: opportunities.length };
    } catch (error) {
      persistenceError = error;
      persistence = { status: "FAILED", schedulerRunId, opportunityRecords: 0, error: String(error.message || error) };
      if (schedulerRunId) {
        try {
          await store.recordRun({
            schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor: new Date().toISOString().slice(0, 10),
            attempt: 1, status: "FAILED", output: { dateRange }, errorSummary: String(error.message || error),
          });
        } catch { /* Preserve the original persistence error. */ }
      }
    }
  }

  const report = {
    schemaVersion: 1, scheduler: "SEARCH_INTELLIGENCE",
    generatedAt: new Date().toISOString(), dateRange,
    sourceFile: result.file, opportunityCount: opportunities.length,
    technical,
    gscDimensions: {
      countries: snapshot.gsc.pagesByCountry?.length ?? 0,
      devices: snapshot.gsc.pagesByDevice?.length ?? 0,
      searchAppearances: snapshot.gsc.searchAppearance?.length ?? 0,
    },
    limitations: [
      "GSC average position is an impression-weighted aggregate, not a fixed rank.",
      "Search volume and competitor difficulty are not inferred.",
      "Technical checks are limited to selected landing pages and accessible public responses.",
      "Opportunities are recommendations, not publishing authorization.",
    ],
    opportunities,
    persistence,
  };
  const path = `${OUTPUT}/scheduler-1-opportunities.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  if (persistenceError) throw persistenceError;
  return { path, opportunityCount: opportunities.length, dateRange, persistenceStatus: persistence.status };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runSearchIntelligence(), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 1 failed: ${error.message}`); process.exitCode = 1; }
}
