import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collect } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

export async function runPerformanceLearning({ dateRange = resolveDateRange(), collectFn = collect } = {}) {
  await mkdir(OUTPUT, { recursive: true });
  const result = await collectFn({ dateRange, outputDir: OUTPUT });
  const snapshot = JSON.parse(await readFile(result.file, "utf8"));
  const organicSessions = snapshot.ga4.reduce((sum, row) => sum + row.sessions, 0);
  const engagedSessions = snapshot.ga4.reduce((sum, row) => sum + row.engagedSessions, 0);
  const gscClicks = snapshot.gsc.pages.reduce((sum, row) => sum + row.clicks, 0);
  const gscImpressions = snapshot.gsc.pages.reduce((sum, row) => sum + row.impressions, 0);
  const report = {
    schemaVersion: 1, scheduler: "PERFORMANCE_AND_LEARNING",
    generatedAt: new Date().toISOString(), dateRange,
    search: { clicks: gscClicks, impressions: gscImpressions, ctr: gscImpressions ? gscClicks / gscImpressions : null },
    analytics: { organicSessions, engagedSessions, engagementRate: organicSessions ? engagedSessions / organicSessions : null },
    productAcquisition: {
      status: "NOT_CONNECTED",
      registrations: null, onboardingCompletions: null, activatedUsers: null, returningActivatedUsers: null,
      explanation: "No authoritative product-database measurement is configured in this read-only collector. Null means unavailable, not zero.",
    },
    contentAttribution: { status: "NOT_AVAILABLE", reason: "No operation-to-landing-page baseline and post-change comparison is configured yet." },
    limitations: ["GA4 data is aggregate, not user-level.", "GSC clicks and GA4 sessions are different measures.", "No causal attribution is inferred."],
  };
  const path = `${OUTPUT}/scheduler-3-performance-report.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  return { path, organicSessions, gscClicks, productAcquisition: report.productAcquisition.status };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runPerformanceLearning(), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 3 failed: ${error.message}`); process.exitCode = 1; }
}
