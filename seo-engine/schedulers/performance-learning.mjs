import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collectPartial } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

export async function runPerformanceLearning({ dateRange = resolveDateRange(), collectFn = collect } = {}) {
  await mkdir(OUTPUT, { recursive: true });
  let snapshot = null;
  let collectionError = null;
  let sourceFile = null;
  try {
    const result = await collectFn({ dateRange, outputDir });
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
      explanation: "A read-only aggregate SQL query exists at seo-engine/activation/production-aggregate-readonly.sql, but Scheduler 3 cannot execute it until a least-privilege production database connection is configured. Null means unavailable, not zero.",
    },
    activationMeasurement: {
      status: "BLOCKED_READ_ONLY_CREDENTIAL",
      definitionVersion: "user-activation-v1",
      definition: "Registered profile + completed onboarding + at least one persisted non-void invoice or persisted expense; returning means qualifying actions on at least two distinct UTC dates.",
      queryFile: "seo-engine/activation/production-aggregate-readonly.sql",
      explanation: "The query emits aggregate counts only. Production activation is not automatically collected until a read-only production connection is available.",
    },
    contentAttribution: { status: "NOT_AVAILABLE", reason: "No operation-to-landing-page baseline and post-change comparison is configured yet." },
    dataQuality: {
      collectionStatus: snapshot ? "COMPLETE" : "FAILED",
      error: collectionError,
      interpretation: "Unavailable values are null; a successfully retrieved zero is reported as zero.",
    },
    limitations: [
      "GA4 data is aggregate, not user-level.",
      "GSC clicks and GA4 sessions are different measures.",
      "No causal attribution is inferred.",
      "The production expenses table has no status/reversal column; persisted expense rows are treated as qualifying, and hard-deleted rows are absent.",
    ],
  };
  const store = createSupabaseSeoStoreFromEnv(env);
  let persistence = { status: "NOT_CONFIGURED", schedulerRunId: null };
  if (store) {
    const scheduledFor = new Date().toISOString().slice(0, 10);
    const attempt = Math.max(1, Number.parseInt(process.env.GITHUB_RUN_ATTEMPT || "1", 10) || 1);
    let schedulerRunId = null;
    try {
      schedulerRunId = await store.recordRun({
        schedulerKey: "PERFORMANCE_AND_LEARNING", scheduledFor, attempt,
        status: "RUNNING", output: { dateRange },
      });
      if (snapshot) {
        await store.recordPerformanceSnapshot({
          snapshotKey: `scheduler-3:${scheduledFor}:${attempt}:GSC:${dateRange.startDate}-${dateRange.endDate}`,
          schedulerRunId, periodStart: dateRange.startDate, periodEnd: dateRange.endDate,
          source: "GSC", metrics: search,
        });
        await store.recordPerformanceSnapshot({
          snapshotKey: `scheduler-3:${scheduledFor}:${attempt}:GA4:${dateRange.startDate}-${dateRange.endDate}`,
          schedulerRunId, periodStart: dateRange.startDate, periodEnd: dateRange.endDate,
          source: "GA4", metrics: analytics,
        });
      }
      await store.recordRun({
        schedulerKey: "PERFORMANCE_AND_LEARNING", scheduledFor, attempt,
        status: gscAvailable && ga4Available ? "SUCCEEDED" : "PARTIAL",
        output: { search, analytics, productAcquisition: report.productAcquisition, dataQuality: report.dataQuality },
        errorSummary: collectionError,
      });
      persistence = { status: "PERSISTED", schedulerRunId };
    } catch (error) {
      persistence = { status: "FAILED", schedulerRunId, error: String(error.message || error) };
      if (schedulerRunId) {
        try {
          await store.recordRun({
            schedulerKey: "PERFORMANCE_AND_LEARNING", scheduledFor, attempt,
            status: "FAILED", output: { search, analytics }, errorSummary: String(error.message || error),
          });
        } catch { /* Scheduler 3 still emits its independent report. */ }
      }
    }
  }
  report.persistence = persistence;
  const path = `${outputDir}/scheduler-3-performance-report.json`;
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", { flag: "w" });
  return { path, searchStatus: search.status, analyticsStatus: analytics.status, productAcquisition: report.productAcquisition.status, persistenceStatus: persistence.status };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runPerformanceLearning(), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 3 failed to write its report: ${error.message}`); process.exitCode = 1; }
}
