import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  aggregatePageQueries,
  buildOpportunityKey,
  buildPageOpportunityId,
  canonicalizePageUrl,
  runSearchIntelligence,
  scorePage,
} from "./search-intelligence.mjs";

const HISTORICAL_PAGE_URLS = [
  "http://finflowtrack.com/",
  "https://finflowtrack.com/",
  "https://finflowtrack.com/blog/how-to-keep-track-of-business-expenses",
  "https://finflowtrack.com/blog/how-to-track-business-expenses",
  "https://finflowtrack.com/blog/small-business-accounting-software",
  "https://finflowtrack.com/blog/weekly-expense-tracking-for-freelancers",
  "https://www.finflowtrack.com/",
  "https://www.finflowtrack.com/about",
  "https://www.finflowtrack.com/ai-bookkeeper",
  "https://www.finflowtrack.com/auth",
  "https://www.finflowtrack.com/blog",
  "https://www.finflowtrack.com/blog/accounts-payable-management",
  "https://www.finflowtrack.com/blog/accounts-receivable-management",
  "https://www.finflowtrack.com/blog/balance-sheet-for-small-business",
  "https://www.finflowtrack.com/blog/best-accounting-software-for-small-business",
  "https://www.finflowtrack.com/blog/bookkeeping-vs-accounting",
  "https://www.finflowtrack.com/blog/break-even-analysis-small-business",
  "https://www.finflowtrack.com/blog/cash-flow-forecasting-small-business",
  "https://www.finflowtrack.com/blog/financial-ratios-for-small-business",
  "https://www.finflowtrack.com/blog/free-accounting-software-for-small-business",
  "https://www.finflowtrack.com/blog/how-to-create-a-business-budget",
  "https://www.finflowtrack.com/blog/how-to-create-an-invoice",
  "https://www.finflowtrack.com/blog/how-to-do-bookkeeping-for-a-small-business",
  "https://www.finflowtrack.com/blog/how-to-keep-track-of-business-expenses",
  "https://www.finflowtrack.com/blog/how-to-track-business-expenses",
  "https://www.finflowtrack.com/blog/inventory-management-basics",
  "https://www.finflowtrack.com/blog/managing-business-cash-flow",
  "https://www.finflowtrack.com/blog/profit-and-loss-statement-small-business",
  "https://www.finflowtrack.com/blog/reducing-late-invoice-payments",
  "https://www.finflowtrack.com/blog/small-business-accounting-software",
  "https://www.finflowtrack.com/blog/small-business-bookkeeping-checklist",
  "https://www.finflowtrack.com/blog/weekly-expense-tracking-for-freelancers",
  "https://www.finflowtrack.com/blog/what-is-accounting-software",
  "https://www.finflowtrack.com/careers",
  "https://www.finflowtrack.com/changelog",
  "https://www.finflowtrack.com/compare/finflow-track-vs-quickbooks",
  "https://www.finflowtrack.com/compare/finflow-track-vs-wave",
  "https://www.finflowtrack.com/compare/finflow-track-vs-xero",
  "https://www.finflowtrack.com/compare/finflow-track-vs-zoho-books",
  "https://www.finflowtrack.com/features",
  "https://www.finflowtrack.com/forgot-password",
  "https://www.finflowtrack.com/guides",
  "https://www.finflowtrack.com/help",
  "https://www.finflowtrack.com/integrations",
  "https://www.finflowtrack.com/press",
  "https://www.finflowtrack.com/pricing",
  "https://www.finflowtrack.com/privacy",
  "https://www.finflowtrack.com/security",
  "https://www.finflowtrack.com/signup",
  "https://www.finflowtrack.com/terms",
  "https://www.finflowtrack.com/testimonials"
];

const TARGET_URL = "https://www.finflowtrack.com/blog/free-accounting-software-for-small-business";
const COMPETING_URL = "https://www.finflowtrack.com/blog/reducing-late-invoice-payments";
const TARGET_QUERY = "free business accounting apps worth considering";
const REPORTING_PERIOD = { startDate: "2026-10-19", endDate: "2026-11-15" };
// Exact URL inventory and metrics are derived from Actions artifact 14494691265 (run 44448533423), source commit 815f9df90b3581071f9864cf7d984b43f9939cbe. The extracted JSON SHA-256 was verified before generating this list.
const HISTORICAL_ARTIFACT_SHA256 = "b44222f584e963e3de17f450fee8dba68c6b1586cbbbf8f025973c2c0c6eff83";

const TARGET_QUERY_DAILY_ROWS = [
  { date: "2026-11-12", page: TARGET_URL, query: TARGET_QUERY, clicks: 0, impressions: 9, ctr: 0, position: 10.333333333333334 },
  { date: "2026-11-13", page: TARGET_URL, query: TARGET_QUERY, clicks: 0, impressions: 6, ctr: 0, position: 10.166666666666666 },
  { date: "2026-11-14", page: TARGET_URL, query: TARGET_QUERY, clicks: 0, impressions: 8, ctr: 0, position: 9.875 },
  { date: "2026-11-15", page: TARGET_URL, query: TARGET_QUERY, clicks: 0, impressions: 8, ctr: 0, position: 8.75 },
];

const TARGET_PAGE_METRICS = {
  page: TARGET_URL,
  clicks: 0,
  impressions: 702,
  ctr: 0,
  position: 12.964387464387464,
};

const COMPETING_PAGE_METRICS = {
  page: COMPETING_URL,
  clicks: 0,
  impressions: 2,
  ctr: 0,
  position: 47.5,
};

test("the 51 historical GSC page URLs have unique deterministic SHA-256 identities", () => {
  assert.equal(HISTORICAL_ARTIFACT_SHA256.length, 64);
  assert.equal(HISTORICAL_PAGE_URLS.length, 51);

  const forward = HISTORICAL_PAGE_URLS.map((url) => [url, buildPageOpportunityId(url)]);
  assert.equal(new Set(forward.map(([, id]) => id)).size, 51);
  const legacyIds = new Set(HISTORICAL_PAGE_URLS.map((url) => "gsc-" + Buffer.from(url).toString("base64url").slice(0, 24)));
  assert.equal(legacyIds.size, 3, "The historical inventory must reproduce the legacy truncated-ID collision groups.");

  for (const [, id] of forward) {
    assert.match(id, /^gsc-[a-f0-9]{64}$/);
  }

  const reversed = [...HISTORICAL_PAGE_URLS].reverse()
    .map((url) => [url, buildPageOpportunityId(url)]);
  assert.deepEqual(Object.fromEntries(reversed), Object.fromEntries(forward));
});

test("WHATWG canonicalization merges equivalent URLs and preserves meaningful URL dimensions", () => {
  const httpCanonical = canonicalizePageUrl("HTTP://EXAMPLE.COM:80/a/../b#section");
  assert.equal(httpCanonical, "http://example.com/b");
  assert.equal(
    buildPageOpportunityId("HTTP://EXAMPLE.COM:80/a/../b#section"),
    buildPageOpportunityId("http://example.com/b"),
  );

  const httpsCanonical = canonicalizePageUrl("HTTPS://EXAMPLE.COM:443/a/../b#section");
  assert.equal(httpsCanonical, "https://example.com/b");
  assert.equal(
    buildPageOpportunityId("HTTPS://EXAMPLE.COM:443/a/../b#section"),
    buildPageOpportunityId("https://example.com/b"),
  );

  assert.equal(
    canonicalizePageUrl("https://bücher.example/a"),
    "https://xn--bcher-kva.example/a",
  );

  const distinctUrlPairs = [
    ["HTTP versus HTTPS", "http://example.com/path", "https://example.com/path"],
    ["non-default port", "https://example.com/path", "https://example.com:8443/path"],
    ["path case", "https://example.com/Path", "https://example.com/path"],
    ["trailing slash", "https://example.com/path", "https://example.com/path/"],
    ["query parameter order", "https://example.com/path?a=1&b=2", "https://example.com/path?b=2&a=1"],
    ["tracking parameter", "https://example.com/path", "https://example.com/path?utm_source=search"],
    ["percent-encoded slash", "https://example.com/a%2Fb", "https://example.com/a/b"],
  ];

  for (const [dimension, left, right] of distinctUrlPairs) {
    assert.notEqual(canonicalizePageUrl(left), canonicalizePageUrl(right), dimension);
    assert.notEqual(buildPageOpportunityId(left), buildPageOpportunityId(right), dimension);
  }
});

test("invalid, non-HTTP(S), relative, and credential-bearing page URLs are rejected", () => {
  for (const value of [
    "",
    "not a URL",
    "/relative/path",
    "//example.com/path",
    "ftp://example.com/file",
    "javascript:alert(1)",
    "https://user@example.com/path",
    "https://user:password@example.com/path",
    "https://@example.com/path",
  ]) {
    assert.throws(() => canonicalizePageUrl(value), TypeError, value);
    assert.throws(() => buildPageOpportunityId(value), TypeError, value);
  }
});

test("query grouping uses canonical page URLs and GSC query text never enters page identity", () => {
  const grouped = aggregatePageQueries([
    { page: "HTTPS://EXAMPLE.COM:443/a/../b#one", query: "bookkeeping software", clicks: 1, impressions: 10, ctr: 0.1, position: 10 },
    { page: "https://example.com/b#two", query: "bookkeeping software", clicks: 2, impressions: 20, ctr: 0.1, position: 12 },
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].page, "https://example.com/b");
  assert.equal(grouped[0].clicks, 3);
  assert.equal(grouped[0].impressions, 30);
  assert.ok(Math.abs(grouped[0].position - 11.333333333333334) < 1e-12);

  const firstQuery = scorePage(
    TARGET_PAGE_METRICS,
    [{ page: TARGET_URL, query: "accounting software", clicks: 0, impressions: 31, ctr: 0, position: 9.774193548387096 }],
  );
  const secondQuery = scorePage(
    TARGET_PAGE_METRICS,
    [{ page: TARGET_URL, query: "invoice application", clicks: 0, impressions: 31, ctr: 0, position: 9.774193548387096 }],
  );
  assert.equal(firstQuery.id, secondQuery.id);
});

test("historical score-78 and score-31 opportunities retain their original evidence and distinct page IDs", () => {
  const queries = aggregatePageQueries(TARGET_QUERY_DAILY_ROWS);
  const target = scorePage(TARGET_PAGE_METRICS, queries);
  const competitor = scorePage(COMPETING_PAGE_METRICS, []);

  assert.equal(target.score, 78);
  assert.equal(competitor.score, 31);
  assert.notEqual(target.id, competitor.id);
  const legacyId = (url) => "gsc-" + Buffer.from(url).toString("base64url").slice(0, 24);
  assert.equal(legacyId(TARGET_URL), legacyId(COMPETING_URL), "The historical score-78 and score-31 pages shared the legacy truncated ID.");
  assert.match(target.id, /^gsc-[a-f0-9]{64}$/);
  assert.match(competitor.id, /^gsc-[a-f0-9]{64}$/);

  const targetQuery = target.evidence.sampleQueries.find((row) => row.query === TARGET_QUERY);
  assert.ok(targetQuery);
  assert.equal(targetQuery.clicks, 0);
  assert.equal(targetQuery.impressions, 31);
  assert.equal(targetQuery.ctr, 0);
  assert.ok(Math.abs(targetQuery.position - 9.774193548387096) < 1e-12);

  assert.equal(target.evidence.impressions, 702);
  assert.equal(target.evidence.clicks, 0);
  assert.equal(target.evidence.averagePosition, 12.964387464387464);
  assert.deepEqual(competitor.evidence.sampleQueries, []);
  assert.equal(competitor.evidence.impressions, 2);
  assert.equal(competitor.evidence.averagePosition, 47.5);
});

test("actual Scheduler 1 run-key and Supabase adapter path keeps both pages addressable across retries", async () => {
  const acceptanceProjectRef = "bufbyfwstdqvwnkhyrea";
  const schedulerRunId = "00000000-0000-4000-8000-000000000101";
  const envKeys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SEO_PERSISTENCE_REQUIRED",
    "SEO_OPS_ALLOWED_PROJECT_REF",
  ];
  const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  process.env.SUPABASE_URL = "https://" + acceptanceProjectRef + ".supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "stage-c02-mocked-service-role-key";
  process.env.SEO_PERSISTENCE_REQUIRED = "true";
  process.env.SEO_OPS_ALLOWED_PROJECT_REF = acceptanceProjectRef;

  const persistedByUniqueKey = new Map();
  const rpcRequests = [];
  let nextOpportunityId = 1;

  const fakeFetch = async (input, options = {}) => {
    const url = new URL(String(input));

    if (url.hostname === acceptanceProjectRef + ".supabase.co") {
      const rpcName = url.pathname.split("/").at(-1);
      const payload = JSON.parse(options.body || "{}");
      rpcRequests.push({ rpcName, payload });

      if (rpcName === "seo_ops_record_run") {
        return Response.json(schedulerRunId);
      }

      if (rpcName === "seo_ops_record_opportunity") {
        const existing = persistedByUniqueKey.get(payload.p_opportunity_key);
        if (existing) {
          const existingId = existing.id;
          Object.assign(existing, payload);
          return Response.json(existingId);
        }

        const id = "00000000-0000-4000-8000-" + String(nextOpportunityId++).padStart(12, "0");
        persistedByUniqueKey.set(payload.p_opportunity_key, { ...payload, id });
        return Response.json(id);
      }

      throw new Error("Unexpected mocked Supabase RPC: " + rpcName);
    }

    if (url.pathname === "/sitemap.xml") {
      return new Response("<urlset>" + TARGET_URL + COMPETING_URL + "</urlset>", { status: 200 });
    }

    const html = [
      "<html><head><title>FinFlow fixture</title>",
      '<meta name="description" content="Offline regression fixture">',
      '<link rel="canonical" href="',
      url.href,
      '"></head><body>fixture</body></html>',
    ].join("");
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };

  const outputDir = await mkdtemp(path.join(os.tmpdir(), "finflow-stage-c02-identity-"));
  const snapshotPath = path.join(outputDir, "historical-snapshot.json");
  const snapshot = {
    evidenceMode: "HISTORICAL_GSC_ARTIFACT",
    fetchedAt: "2026-11-19T03:02:08.554Z",
    dateRange: REPORTING_PERIOD,
    gsc: {
      pages: [
        { ...TARGET_PAGE_METRICS, impressions: 701 },
        { ...TARGET_PAGE_METRICS, page: "HTTPS://www.finflowtrack.com:443/blog/free-accounting-software-for-small-business#overview", impressions: 1 },
        COMPETING_PAGE_METRICS,
      ],
      pageQueries: TARGET_QUERY_DAILY_ROWS,
    },
  };

  try {
    await writeFile(snapshotPath, JSON.stringify(snapshot));

    const run = () => runSearchIntelligence({
      dateRange: REPORTING_PERIOD,
      collectFn: async () => ({ file: snapshotPath }),
      fetchImpl: fakeFetch,
      outputDir,
      runAttempt: 777,
    });

    const firstRun = await run();
    assert.equal(firstRun.persistenceStatus, "PERSISTED");

    const firstReport = JSON.parse(await readFile(firstRun.path, "utf8"));
    assert.equal(firstReport.opportunityCount, 2);
    assert.equal(firstReport.opportunities.filter((item) => item.targetUrl === TARGET_URL).length, 1);

    const target = firstReport.opportunities.find((item) => item.targetUrl === TARGET_URL);
    const competitor = firstReport.opportunities.find((item) => item.targetUrl === COMPETING_URL);
    assert.ok(target);
    assert.ok(competitor);
    assert.equal(target.score, 78);
    assert.equal(competitor.score, 31);
    assert.notEqual(target.id, competitor.id);
    assert.equal(target.id, buildPageOpportunityId(TARGET_URL));
    assert.equal(competitor.id, buildPageOpportunityId(COMPETING_URL));

    const firstOpportunityPayloads = rpcRequests
      .filter((request) => request.rpcName === "seo_ops_record_opportunity")
      .map((request) => request.payload);
    assert.equal(firstOpportunityPayloads.length, 2);

    const targetKey = buildOpportunityKey(schedulerRunId, target.id, REPORTING_PERIOD.endDate);
    const competitorKey = buildOpportunityKey(schedulerRunId, competitor.id, REPORTING_PERIOD.endDate);
    assert.notEqual(targetKey, competitorKey);

    const targetPayload = firstOpportunityPayloads.find((payload) => payload.p_target_url === TARGET_URL);
    const competitorPayload = firstOpportunityPayloads.find((payload) => payload.p_target_url === COMPETING_URL);
    assert.ok(targetPayload);
    assert.ok(competitorPayload);
    assert.equal(targetPayload.p_opportunity_key, targetKey);
    assert.equal(competitorPayload.p_opportunity_key, competitorKey);
    assert.equal(targetPayload.p_query_text, TARGET_QUERY);
    assert.equal(competitorPayload.p_query_text, null);
    assert.equal(targetPayload.p_score, 78);
    assert.equal(competitorPayload.p_score, 31);
    assert.equal(persistedByUniqueKey.size, 2);

    const firstPersistedIds = new Map(
      [...persistedByUniqueKey].map(([key, row]) => [key, row.id]),
    );
    assert.equal(persistedByUniqueKey.get(targetKey).p_target_url, TARGET_URL);
    assert.equal(persistedByUniqueKey.get(competitorKey).p_target_url, COMPETING_URL);

    const secondRun = await run();
    assert.equal(secondRun.persistenceStatus, "PERSISTED");
    assert.equal(persistedByUniqueKey.size, 2);

    for (const [key, originalId] of firstPersistedIds) {
      assert.equal(persistedByUniqueKey.get(key).id, originalId);
    }
    assert.equal(persistedByUniqueKey.get(targetKey).p_target_url, TARGET_URL);
    assert.equal(persistedByUniqueKey.get(targetKey).p_score, 78);
    assert.equal(persistedByUniqueKey.get(competitorKey).p_target_url, COMPETING_URL);
    assert.equal(persistedByUniqueKey.get(competitorKey).p_score, 31);

    const tableMigration = await readFile(
      new URL("../../supabase/migrations/20261119122622_seo_operations_persistence.sql", import.meta.url),
      "utf8",
    );
    const rpcMigration = await readFile(
      new URL("../../supabase/migrations/20261119123210_seo_ops_rpc_ingest.sql", import.meta.url),
      "utf8",
    );
    assert.match(tableMigration, /opportunity_key text not null unique/i);
    assert.match(rpcMigration, /on conflict \(opportunity_key\) do update/i);
  } finally {
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
    await rm(outputDir, { recursive: true, force: true });
  }
});
