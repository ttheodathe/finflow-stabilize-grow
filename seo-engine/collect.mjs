import { mkdir, writeFile } from "node:fs/promises";
import { createAccessToken } from "./google-auth.mjs";
import { normalizePageUrl, resolveDateRange } from "./normalize.mjs";

const GSC_SITE_URL = process.env.GSC_SITE_URL || "sc-domain:finflowtrack.com";
const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || "546829553";
const OUTPUT_DIR = process.env.SEO_OUTPUT_DIR || "seo-output";
const PAGE_SIZE = 25_000;
const GA4_PAGE_SIZE = 100_000;

async function requestJson(url, options, { fetchImpl = fetch, retries = 3 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetchImpl(url, options);
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      continue;
    }
    const message = await response.text().catch(() => "");
    throw new Error(`Google API request failed (HTTP ${response.status}): ${message.slice(0, 500)}`);
  }
  throw new Error("Google API request exhausted its retry budget.");
}

async function collectGscDimension(accessToken, dateRange, dimensions, fetchImpl = fetch) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`;
  const rows = [];
  for (let startRow = 0; ; startRow += PAGE_SIZE) {
    const page = await requestJson(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions,
        type: "web",
        aggregationType: "auto",
        rowLimit: PAGE_SIZE,
        startRow,
      }),
    }, { fetchImpl });
    const batch = Array.isArray(page.rows) ? page.rows : [];
    rows.push(...batch.map((row) => {
      const metric = (value) => value === null || value === undefined
        ? null : Number.isFinite(Number(value)) ? Number(value) : null;
      const record = {
        clicks: metric(row.clicks),
        impressions: metric(row.impressions),
        ctr: metric(row.ctr),
        position: metric(row.position),
      };
      dimensions.forEach((dimension, index) => {
        const value = row.keys?.[index] ?? null;
        record[dimension] = dimension === "page" && value ? normalizePageUrl(value) : value;
      });
      return record;
    }));
    if (batch.length < PAGE_SIZE) break;
    if (startRow >= 250_000) throw new Error("GSC pagination safety limit reached (250,000 rows). Narrow the date range.");
  }
  return rows;
}

async function collectGsc(accessToken, dateRange, fetchImpl = fetch) {
  // Keep total-page metrics separate from query rows: anonymized queries are
  // omitted from query-dimension reports and must not understate page totals.
  const pages = await collectGscDimension(accessToken, dateRange, ["date", "page"], fetchImpl);
  const queries = await collectGscDimension(accessToken, dateRange, ["date", "query"], fetchImpl);
  const pageQueries = await collectGscDimension(accessToken, dateRange, ["date", "page", "query"], fetchImpl);
  const pagesByCountry = await collectGscDimension(accessToken, dateRange, ["date", "page", "country"], fetchImpl);
  const pagesByDevice = await collectGscDimension(accessToken, dateRange, ["date", "page", "device"], fetchImpl);
  const searchAppearance = await collectGscDimension(accessToken, dateRange, ["date", "searchAppearance"], fetchImpl);
  return { pages, queries, pageQueries, pagesByCountry, pagesByDevice, searchAppearance };
}

async function collectGa4(accessToken, dateRange, fetchImpl = fetch) {
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(GA4_PROPERTY_ID)}:runReport`;
  const rows = [];
  for (let offset = 0; ; offset += GA4_PAGE_SIZE) {
    const page = await requestJson(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [
          { name: "date" },
          { name: "landingPagePlusQueryString" },
          { name: "sessionDefaultChannelGroup" },
        ],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "engagedSessions" },
          { name: "keyEvents" },
        ],
        dimensionFilter: {
          filter: {
            fieldName: "sessionDefaultChannelGroup",
            stringFilter: { matchType: "EXACT", value: "Organic Search" },
          },
        },
        limit: GA4_PAGE_SIZE,
        offset,
      }),
    }, { fetchImpl });
    const batch = Array.isArray(page.rows) ? page.rows : [];
    rows.push(...batch.map((row) => {
      const dimension = row.dimensionValues || [];
      const metric = row.metricValues || [];
      const landing = dimension[1]?.value || "/";
      let landingPath = landing;
      try {
        landingPath = normalizePageUrl(new URL(landing, "https://www.finflowtrack.com").toString());
      } catch {
        landingPath = "/";
      }
      return {
        date: dimension[0]?.value ?? null,
        landingPage: landingPath,
        channel: dimension[2]?.value ?? "Organic Search",
        sessions: Number(metric[0]?.value ?? 0),
        activeUsers: Number(metric[1]?.value ?? 0),
        engagedSessions: Number(metric[2]?.value ?? 0),
        keyEvents: Number(metric[3]?.value ?? 0),
      };
    }));
    if (batch.length < GA4_PAGE_SIZE) break;
    if (offset >= 500_000) throw new Error("GA4 pagination safety limit reached (500,000 rows). Narrow the date range.");
  }
  return rows;
}

export async function collect({ dateRange, token, outputDir = OUTPUT_DIR, fetchImpl = fetch } = {}) {
  const accessToken = token || await createAccessToken({ fetchImpl });
  // GSC is Scheduler 1's required evidence source. GA4 is supplementary:
  // a GA4 outage must never discard a successful GSC collection.
  const gscRows = await collectGsc(accessToken, dateRange, fetchImpl);
  let ga4Rows = null;
  let ga4Error = null;
  try {
    ga4Rows = await collectGa4(accessToken, dateRange, fetchImpl);
  } catch (error) {
    ga4Error = String(error.message || error);
  }
  const snapshot = {
    schemaVersion: 1,
    source: "independent read-only Google Search Console and GA4 APIs",
    property: { gsc: GSC_SITE_URL, ga4: GA4_PROPERTY_ID },
    dateRange,
    fetchedAt: new Date().toISOString(),
    sourceStatus: { gsc: "AVAILABLE", ga4: ga4Rows === null ? "UNAVAILABLE" : "AVAILABLE" },
    sourceErrors: { gsc: null, ga4: ga4Error },
    counts: {
      gscPageRows: gscRows.pages.length,
      gscQueryRows: gscRows.queries.length,
      gscPageQueryRows: gscRows.pageQueries.length,
      gscPageCountryRows: gscRows.pagesByCountry.length,
      gscPageDeviceRows: gscRows.pagesByDevice.length,
      gscSearchAppearanceRows: gscRows.searchAppearance.length,
      ga4Rows: ga4Rows?.length ?? null,
    },
    gsc: gscRows,
    ga4: ga4Rows,
  };
  await mkdir(outputDir, { recursive: true });
  const file = `${outputDir}/seo-data-${dateRange.startDate}-to-${dateRange.endDate}.json`;
  await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "w" });
  return { file, counts: snapshot.counts, dateRange };
}


/**
 * Collect GSC and GA4 independently for Scheduler 3. One provider outage must
 * not discard the other provider's valid read-only metrics.
 */
export async function collectPartial({ dateRange, token, outputDir = OUTPUT_DIR, fetchImpl = fetch } = {}) {
  let accessToken = token || null;
  let tokenError = null;
  if (!accessToken) {
    try { accessToken = await createAccessToken({ fetchImpl }); }
    catch (error) { tokenError = String(error.message || error); }
  }

  const [gscResult, ga4Result] = accessToken
    ? await Promise.allSettled([
      collectGsc(accessToken, dateRange, fetchImpl),
      collectGa4(accessToken, dateRange, fetchImpl),
    ])
    : [null, null];

  const gscAvailable = gscResult?.status === "fulfilled";
  const ga4Available = ga4Result?.status === "fulfilled";
  const gscError = tokenError || (gscResult?.status === "rejected" ? String(gscResult.reason?.message || gscResult.reason) : null);
  const ga4Error = tokenError || (ga4Result?.status === "rejected" ? String(ga4Result.reason?.message || ga4Result.reason) : null);
  const gsc = gscAvailable ? gscResult.value : null;
  const ga4 = ga4Available ? ga4Result.value : null;

  const snapshot = {
    schemaVersion: 1,
    source: "independent read-only Google Search Console and GA4 APIs",
    property: { gsc: GSC_SITE_URL, ga4: GA4_PROPERTY_ID },
    dateRange,
    fetchedAt: new Date().toISOString(),
    sourceStatus: {
      gsc: gscAvailable ? "AVAILABLE" : "UNAVAILABLE",
      ga4: ga4Available ? "AVAILABLE" : "UNAVAILABLE",
    },
    sourceErrors: { gsc: gscError, ga4: ga4Error },
    counts: {
      gscPageRows: gsc?.pages.length ?? null,
      gscQueryRows: gsc?.queries.length ?? null,
      gscPageQueryRows: gsc?.pageQueries.length ?? null,
      gscPageCountryRows: gsc?.pagesByCountry.length ?? null,
      gscPageDeviceRows: gsc?.pagesByDevice.length ?? null,
      gscSearchAppearanceRows: gsc?.searchAppearance.length ?? null,
      ga4Rows: ga4?.length ?? null,
    },
    gsc,
    ga4,
  };
  await mkdir(outputDir, { recursive: true });
  const file = `${outputDir}/seo-data-partial-${dateRange.startDate}-to-${dateRange.endDate}.json`;
  await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: "w" });
  return { file, counts: snapshot.counts, dateRange, sourceStatus: snapshot.sourceStatus, sourceErrors: snapshot.sourceErrors };
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!["--start-date", "--end-date"].includes(key)) throw new Error(`Unknown argument: ${key}`);
    values[key] = args[index + 1];
    index += 1;
  }
  return resolveDateRange({ startDate: values["--start-date"], endDate: values["--end-date"] });
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    const dateRange = parseArgs(process.argv.slice(2));
    const result = await collect({ dateRange });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`SEO data collection failed: ${error.message}`);
    process.exitCode = 1;
  }
}
