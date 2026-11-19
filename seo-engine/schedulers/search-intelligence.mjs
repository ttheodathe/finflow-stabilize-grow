import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collect } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

function clamp(value) { return Math.max(0, Math.min(5, value)); }

function completeSum(rows, key) {
  if (!rows.length || rows.some(row => !Number.isFinite(row[key]))) return null;
  return rows.reduce((sum, row) => sum + row[key], 0);
}

export function aggregatePageQueries(rows = []) {
  const grouped = new Map();
  for (const row of rows) {
    if (typeof row.page !== "string" || typeof row.query !== "string" || !row.query.trim()) continue;
    const key = `${row.page}\\u0000${row.query}`;
    const current = grouped.get(key) || { page: row.page, query: row.query, rows: [] };
    current.rows.push(row);
    grouped.set(key, current);
  }
  return [...grouped.values()].map(group => {
    const clicks = completeSum(group.rows, "clicks");
    const impressions = completeSum(group.rows, "impressions");
    const positionComplete = group.rows.length > 0 && group.rows.every(row =>
      Number.isFinite(row.impressions) && row.impressions > 0 && Number.isFinite(row.position));
    const positionWeight = positionComplete
      ? group.rows.reduce((sum, row) => sum + row.position * row.impressions, 0) : null;
    const positionImpressions = positionComplete
      ? group.rows.reduce((sum, row) => sum + row.impressions, 0) : null;
    return {
      page: group.page, query: group.query, clicks, impressions,
      ctr: clicks === null || impressions === null ? null : impressions > 0 ? clicks / impressions : 0,
      position: positionWeight === null || !positionImpressions ? null : positionWeight / positionImpressions,
    };
  }).sort((a,b) => (b.impressions ?? -1) - (a.impressions ?? -1));
}

export function scorePage(page, queries) {
  const metricsComplete = [page.clicks, page.impressions, page.ctr, page.position].every(Number.isFinite) && page.impressions > 0;
  const impressionsForScore = Number.isFinite(page.impressions) ? page.impressions : 0;
  const ctrForScore = Number.isFinite(page.ctr) ? page.ctr : 0;
  const positionForScore = Number.isFinite(page.position) ? page.position : 0;
  const queryRows = queries.filter(row => row.page === page.page);
  const relevant = queryRows.filter(row => /account|invoice|expense|bookkeep|cash flow|receivable|payable|freelanc|small business/i.test(row.query || ""));
  const intentFit = relevant.length > 0 ? 4 : 1;
  const gscOpportunity = clamp(Math.log10(impressionsForScore + 1) * 1.5);
  const ctrOpportunity = clamp(ctrForScore < 0.02 && impressionsForScore >= 20 ? 4 : ctrForScore < 0.05 ? 3 : 1);
  const positionOpportunity = clamp(positionForScore >= 4 && positionForScore <= 20 ? 4 : positionForScore > 20 && positionForScore <= 40 ? 2 : positionForScore > 0 ? 1 : 0);
  const productFit = relevant.length ? 4 : 1;
  const effort = 3;
  const confidence = !metricsComplete ? 0 : impressionsForScore >= 50 ? 4 : impressionsForScore >= 10 ? 3 : 1;
  const score = Math.round(((gscOpportunity + ctrOpportunity + positionOpportunity + intentFit + productFit + effort + confidence) / 35) * 100);
  return {
    id: `gsc-${Buffer.from(page.page).toString("base64url").slice(0, 24)}`,
    targetUrl: page.page, action: "REVIEW_EXISTING_PAGE", score, confidence: confidence / 5,
    evidence: {
      source: "Google Search Console", dateRange: page.dateRange || null,
      sourceCollectionAt: page.sourceCollectionAt || null,
      metricCompleteness: metricsComplete ? "COMPLETE" : "INCOMPLETE",
      clicks: page.clicks, impressions: page.impressions, ctr: page.ctr, averagePosition: page.position,
      relevantQueryCount: relevant.length,
      sampleQueries: relevant.slice(0,10).map(row => ({query:row.query,clicks:row.clicks,impressions:row.impressions,ctr:row.ctr,position:row.position})),
    },
    scoring: {gscOpportunity,ctrOpportunity,positionOpportunity,intentFit,productFit,effort,confidence},
    decision: metricsComplete && impressionsForScore >= 10 && relevant.length > 0 ? "REVIEW_REQUIRED" : "LOW_EVIDENCE",
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

export function buildOpportunityKey(schedulerRunId, opportunityId, reportingPeriodEnd) {
  if (typeof schedulerRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(schedulerRunId)) {
    throw new Error("Opportunity idempotency requires a valid persisted Scheduler 1 run UUID.");
  }
  if (!opportunityId || !reportingPeriodEnd) throw new Error("Opportunity idempotency requires an opportunity key and reporting-period end.");
  return `${schedulerRunId}:${opportunityId}:${reportingPeriodEnd}`;
}

export async function runSearchIntelligence({ dateRange = resolveDateRange(), collectFn = collect, fetchImpl = fetch } = {}) {
  await mkdir(OUTPUT, { recursive: true });
  const result = await collectFn({ dateRange, outputDir: OUTPUT });
  const snapshot = JSON.parse(await readFile(result.file, "utf8"));
  const pages = new Map();
  for (const row of snapshot.gsc.pages) {
    const current = pages.get(row.page) || { page: row.page, rows: [] };
    current.rows.push(row);
    pages.set(row.page, current);
  }
  const queries = aggregatePageQueries(snapshot.gsc.pageQueries);
  const pageValues = [...pages.values()].map(group => {
    const clicks = completeSum(group.rows, "clicks");
    const impressions = completeSum(group.rows, "impressions");
    const positionComplete = group.rows.length > 0 && group.rows.every(row =>
      Number.isFinite(row.impressions) && row.impressions > 0 && Number.isFinite(row.position));
    const positionWeighted = positionComplete
      ? group.rows.reduce((sum, row) => sum + row.position * row.impressions, 0) : null;
    const positionImpressions = positionComplete
      ? group.rows.reduce((sum, row) => sum + row.impressions, 0) : null;
    return {
      page: group.page, clicks, impressions,
      ctr: clicks === null || impressions === null ? null : impressions > 0 ? clicks / impressions : 0,
      position: positionWeighted === null || !positionImpressions ? null : positionWeighted / positionImpressions,
    };
  });
  const opportunities = pageValues.map(page =>
    scorePage({ ...page, dateRange, sourceCollectionAt: snapshot.fetchedAt || null }, queries)
  ).sort((a, b) => b.score - a.score);
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
    const scheduledFor = new Date().toISOString().slice(0, 10);
    const attempt = Math.max(1, Number.parseInt(process.env.GITHUB_RUN_ATTEMPT || "1", 10) || 1);
    try {
      schedulerRunId = await store.recordRun({
        schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor, attempt,
        status: "RUNNING", output: { dateRange, source: "Google Search Console", sourceCollectionAt: snapshot.fetchedAt || null },
      });
      for (const opportunity of opportunities) {
        await store.recordOpportunity({
          opportunityKey: buildOpportunityKey(schedulerRunId, opportunity.id, dateRange.endDate),
          schedulerRunId,
          targetUrl: opportunity.targetUrl,
          queryText: opportunity.evidence?.sampleQueries?.[0]?.query || null,
          opportunityType: opportunity.action,
          score: opportunity.score,
          evidence: { ...opportunity.evidence, scoring: opportunity.scoring, decision: opportunity.decision },
        });
      }
      await store.recordRun({
        schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor, attempt,
        status: "SUCCEEDED",
        output: { opportunityCount: opportunities.length, technicalIssueCount: technical.confirmedIssueCount, dateRange, source: "Google Search Console", sourceCollectionAt: snapshot.fetchedAt || null },
      });
      persistence = { status: "PERSISTED", schedulerRunId, opportunityRecords: opportunities.length };
    } catch (error) {
      persistenceError = error;
      persistence = { status: "FAILED", schedulerRunId, opportunityRecords: 0, error: String(error.message || error) };
      if (schedulerRunId) {
        try {
          await store.recordRun({
            schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor,
            attempt, status: "FAILED", output: { dateRange, source: "Google Search Console", sourceCollectionAt: snapshot.fetchedAt || null }, errorSummary: String(error.message || error),
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
