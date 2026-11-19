import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collect } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

export async function runPerformanceLearning({ dateRange = resolveDateRange(), collectFn = collect } = {}) {
  await mkdir(OUTPUT, { recursive: true });
  let snapshot = null;
  let collectionError = null;
  let sourceFile = null;
  try {
    const result = await collectFn({ dateRange, outputDir: OUTPUT });
    sourceFile = result.file;
    snapshot = JSON.parse(await readFile(result.file, "utf8"));
  } catch (error) {
    collectionError = String(error.message || error);
  }

  const search = snapshot ? {
    status: "AVAILABLE",
    clicks: snapshot.gsc.pages.reduce((sum, row) => sum + row.clicks, 0),
    impressions: snapshot.gsc.pages.reduce((sum, row) => sum + row.impressions, 0),
  } : { status: "UNAVAILABLE", clicks: null, impressions: null };
  if (search.impressions !== null) search.ctr = search.impressions ? search.clicks / search.impressions : null;

  const analytics = snapshot ? {
    status: "AVAILABLE",
    organicSessions: snapshot.ga4.reduce((sum, row) => sum + row.sessions, 0),
    engagedSessions: snapshot.ga4.reduce((sum, row) => sum + row.engagedSessions, 0),
  } : { status: "UNAVAILABLE", organicSessions: null, engagedSessions: null };
  if (analytics.organicSessions !== null) {
    analytics.engagementRate = analytics.organicSessions ? analytics.engagedSessions / analytics.organicSessions : null;
  }

  const report = {
    schemaVersion: 1, scheduler: "PERFORMANCE_AND_LEARNING",
    generatedAt: new Date().toISOString(), dateRange, sourceFile,
    search, analytics,
    productAcquisition: {
      status: "NOT_CONNECTED",
      registrations: null, onboardingCompletions: null, activatedUsers: null, returningActivatedUsers: null,
      explanation: "No authoritative product-database measurement is configured in this read-only collector. Null means unavailable, not zero.",
    },
    contentAttribution: { status: "NOT_AVAILABLE", reason: "No operation-to-landing-page baseline and post-change comparison is configured yet." },
    dataQuality: {
      collectionStatus: snapshot ? "COMPLETE" : "FAILED",
      error: collectionError,
      interpretation: "Unavailable values are null; a successfully retrieved zero is reported as zero.",
    },
    limitations: ["GA4 data is aggregate, not user-level.", "GSC clicks and GA4 sessions are different measures.", "No causal attribution is inferred."],
  };
  const path = `${OUTPUT}/scheduler-3-performance-report.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  return { path, searchStatus: search.status, analyticsStatus: analytics.status, productAcquisition: report.productAcquisition.status };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runPerformanceLearning(), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 3 failed to write its report: ${error.message}`); process.exitCode = 1; }
}
