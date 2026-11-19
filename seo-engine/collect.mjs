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

async function collectGsc(accessToken, dateRange, fetchImpl = fetch) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`;
  const dimensions = ["date", "page", "query"];
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
    rows.push(...batch.map((row) => ({
      date: row.keys?.[0] ?? null,
      page: row.keys?.[1] ? normalizePageUrl(row.keys[1]) : null,
      query: row.keys?.[2] ?? null,
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
    })));
    if (batch.length < PAGE_SIZE) break;
    if (startRow >= 250_000) throw new Error("GSC pagination safety limit reached (250,000 rows). Narrow the date range.");
  }
  return rows;
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
  const gscRows = await collectGsc(accessToken, dateRange, fetchImpl);
  const ga4Rows = await collectGa4(accessToken, dateRange, fetchImpl);
  const snapshot = {
    schemaVersion: 1,
    source: "read-only Google Search Console and GA4 APIs",
    property: { gsc: GSC_SITE_URL, ga4: GA4_PROPERTY_ID },
    dateRange,
    fetchedAt: new Date().toISOString(),
    counts: { gscRows: gscRows.length, ga4Rows: ga4Rows.length },
    gsc: gscRows,
    ga4: ga4Rows,
  };
  await mkdir(outputDir, { recursive: true });
  const file = `${outputDir}/seo-data-${dateRange.startDate}-to-${dateRange.endDate}.json`;
  await writeFile(file, `${JSON.stringify(snapshot, null, 2)}\\n`, { flag: "w" });
  return { file, counts: snapshot.counts, dateRange };
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
