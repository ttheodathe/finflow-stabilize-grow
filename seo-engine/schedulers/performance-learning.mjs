import { readFile, writeFile, mkdir } from "node:fs/promises";
import { collectPartial } from "../collect.mjs";
import { resolveDateRange } from "../normalize.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";
import { resolveSchedulerAttempt } from "./run-attempt.mjs";
import { collectProductionActivationAggregate } from "../activation/collect-production-aggregate.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";

function sumKnown(rows, key) {
  if (rows.length === 0) return 0;
  if (rows.some(row => !Number.isFinite(row[key]))) return null;
  return rows.reduce((sum, row) => sum + row[key], 0);
}

export async function runPerformanceLearning({
  dateRange = resolveDateRange(), collectFn = collectPartial,
  outputDir = OUTPUT, env = process.env, store: injectedStore = undefined,\n  activationCollectorFn = collectProductionActivationAggregate,
} = {}) {
  await mkdir(outputDir, { recursive: true });
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

  const gscAvailable = Boolean(snapshot?.gsc && snapshot.sourceStatus?.gsc !== "UNAVAILABLE");
  const ga4Available = Boolean(snapshot?.ga4 && snapshot.sourceStatus?.ga4 !== "UNAVAILABLE");
  const search = gscAvailable ? {
    status: "AVAILABLE",
    clicks: sumKnown(snapshot.gsc.pages,"clicks"),
    impressions: sumKnown(snapshot.gsc.pages,"impressions"),
  } : { status: "UNAVAILABLE", clicks: null, impressions: null };
  search.ctr = search.impressions === null || search.clicks === null
    ? null : search.impressions > 0 ? search.clicks / search.impressions : 0;

  const analytics = ga4Available ? {
    status: "AVAILABLE",
    organicSessions: sumKnown(snapshot.ga4,"sessions"),
    engagedSessions: sumKnown(snapshot.ga4,"engagedSessions"),
  } : { status: "UNAVAILABLE", organicSessions: null, engagedSessions: null };
  analytics.engagementRate = analytics.organicSessions === null || analytics.engagedSessions === null
    ? null : analytics.organicSessions > 0 ? analytics.engagedSessions / analytics.organicSessions : 0;

  let activationAggregate = null;
  let activationCollectionError = null;
  if (env.SEO_PRODUCTION_READONLY_DATABASE_URL) {
    try {
      activationAggregate = await activationCollectorFn({
        connectionString: env.SEO_PRODUCTION_READONLY_DATABASE_URL,
      });
    } catch (error) {
      activationCollectionError = new Error(String(error.message || error));
    }
  }

  const report = {
    schemaVersion: 1, scheduler: "PERFORMANCE_AND_LEARNING",
    generatedAt: new Date().toISOString(), dateRange, sourceFile,
    search, analytics,
    productAcquisition: activationAggregate ? {
      status: "AVAILABLE",
      registrations: activationAggregate.registeredUsersAllTime,
      onboardingCompletions: activationAggregate.onboardingCompletionsAllTime,
      activatedUsers: activationAggregate.activatedUsersAllTime,
      returningActivatedUsers: activationAggregate.returningActivatedUsersAllTime,
      last30Days: {
        registrations: activationAggregate.newRegistrations30d,
        onboardingCompletions: activationAggregate.newOnboardingCompletions30d,
        activatedUsers: activationAggregate.newActivatedUsers30d,
        returningActivatedUsers: activationAggregate.newReturningActivatedUsers30d,
      },
      sourceWatermark: activationAggregate.sourceWatermark,
    } : {
      status: activationCollectionError ? "FAILED" : "BLOCKED_READ_ONLY_CREDENTIAL",
      registrations: null, onboardingCompletions: null, activatedUsers: null, returningActivatedUsers: null,
      explanation: activationCollectionError?.message || "A read-only aggregate SQL query exists, but SEO_PRODUCTION_READONLY_DATABASE_URL is not configured. Null means unavailable, not zero.",
    },
    activationMeasurement: {
      status: activationAggregate ? "AVAILABLE" : activationCollectionError ? "FAILED" : "BLOCKED_READ_ONLY_CREDENTIAL",
      definitionVersion: "user-activation-v1",
      definition: "Registered profile + completed onboarding + at least one persisted non-void invoice or persisted expense; returning means qualifying actions on at least two distinct UTC dates.",
      queryFile: "seo-engine/activation/production-aggregate-readonly.sql",
      sourceWatermark: activationAggregate?.sourceWatermark || null,
      counts: activationAggregate || null,
      explanation: activationAggregate
        ? "Production counts were collected through the dedicated PostgreSQL connection and contain aggregate counts only."
        : activationCollectionError?.message || "The query emits aggregate counts only. Configure the dedicated read-only production connection to collect activation automatically.",
    },
    contentAttribution: { status: "NOT_AVAILABLE", reason: "No operation-to-landing-page baseline and post-change comparison is configured yet." },
    dataQuality: {
      collectionStatus: gscAvailable && ga4Available ? "COMPLETE" : (gscAvailable || ga4Available ? "PARTIAL" : "FAILED"),
      sourceStatus: snapshot?.sourceStatus || { gsc: "UNAVAILABLE", ga4: "UNAVAILABLE" },
      sourceErrors: snapshot?.sourceErrors || null,
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
  let store = injectedStore;
  let storeConfigurationError = null;
  if (injectedStore === undefined) {
    try { store = createSupabaseSeoStoreFromEnv(env); }
    catch (error) { storeConfigurationError = String(error.message || error); }
  }
  const persistenceRequired = env.SEO_PERSISTENCE_REQUIRED === "true";
  let persistenceError = storeConfigurationError ? new Error(storeConfigurationError) : null;
  let persistence = store
    ? { status: "PENDING", schedulerRunId: null }
    : storeConfigurationError || persistenceRequired
      ? { status: "BLOCKED", reason: "REQUIRED_PERSISTENCE_UNAVAILABLE", schedulerRunId: null, error: storeConfigurationError || "SEO_PERSISTENCE_REQUIRED=true but no Supabase persistence store is configured." }
      : { status: "NOT_CONFIGURED", schedulerRunId: null };
  if (!store && persistenceRequired && !persistenceError) {
    persistenceError = new Error("SEO_PERSISTENCE_REQUIRED=true but Supabase persistence is not configured.");
  }
  if (store) {
    const scheduledFor = new Date().toISOString().slice(0, 10);
    const attempt = resolveSchedulerAttempt(env);
    let schedulerRunId = null;
    try {
      schedulerRunId = await store.recordRun({
        schedulerKey: "PERFORMANCE_AND_LEARNING", scheduledFor, attempt,
        status: "RUNNING", output: { dateRange },
      });
      if (gscAvailable) {
        await store.recordPerformanceSnapshot({
          snapshotKey: `scheduler-3:${scheduledFor}:${attempt}:GSC:${dateRange.startDate}-${dateRange.endDate}`,
          schedulerRunId, periodStart: dateRange.startDate, periodEnd: dateRange.endDate,
          source: "GSC", metrics: search,
        });
      }
      if (ga4Available) {
        await store.recordPerformanceSnapshot({
          snapshotKey: `scheduler-3:${scheduledFor}:${attempt}:GA4:${dateRange.startDate}-${dateRange.endDate}`,
          schedulerRunId, periodStart: dateRange.startDate, periodEnd: dateRange.endDate,
          source: "GA4", metrics: analytics,
        });
      }
      if (activationAggregate) {
        const limitations = [
          "Aggregate counts only; no user identifiers or financial values are collected.",
          "The production expenses table has no status/reversal column; persisted expense rows are treated as qualifying and hard-deleted rows are absent.",
        ];
        await store.recordActivationSnapshot({
          snapshotDate: scheduledFor,
          registeredUsers: activationAggregate.registeredUsersAllTime,
          onboardingCompletions: activationAggregate.onboardingCompletionsAllTime,
          activatedUsers: activationAggregate.activatedUsersAllTime,
          returningActivatedUsers: activationAggregate.returningActivatedUsersAllTime,
          definitionVersion: "user-activation-v1",
          sourceWatermark: activationAggregate.sourceWatermark,
          limitations,
        });
        await store.recordPerformanceSnapshot({
          snapshotKey: `scheduler-3:${scheduledFor}:${attempt}:SUPABASE_ACTIVATION:30d`,
          schedulerRunId,
          periodStart: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          periodEnd: scheduledFor,
          source: "SUPABASE_ACTIVATION",
          metrics: {
            registeredUsersAllTime: activationAggregate.registeredUsersAllTime,
            onboardingCompletionsAllTime: activationAggregate.onboardingCompletionsAllTime,
            activatedUsersAllTime: activationAggregate.activatedUsersAllTime,
            returningActivatedUsersAllTime: activationAggregate.returningActivatedUsersAllTime,
            newRegistrations30d: activationAggregate.newRegistrations30d,
            newOnboardingCompletions30d: activationAggregate.newOnboardingCompletions30d,
            newActivatedUsers30d: activationAggregate.newActivatedUsers30d,
            newReturningActivatedUsers30d: activationAggregate.newReturningActivatedUsers30d,
            sourceWatermark: activationAggregate.sourceWatermark,
          },
        });
      }
      await store.recordRun({
        schedulerKey: "PERFORMANCE_AND_LEARNING", scheduledFor, attempt,
        status: gscAvailable && ga4Available && !activationCollectionError ? "SUCCEEDED" : "PARTIAL",
        output: { search, analytics, productAcquisition: report.productAcquisition, activationMeasurement: report.activationMeasurement, dataQuality: report.dataQuality },
        errorSummary: collectionError || Object.values(snapshot?.sourceErrors || {}).filter(Boolean).join("; ") || null,
      });
      persistence = { status: "PERSISTED", schedulerRunId };
    } catch (error) {
      persistenceError = error;
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
  if (persistenceError) throw persistenceError;
  if (activationCollectionError) throw activationCollectionError;
  if (report.dataQuality.collectionStatus === "FAILED") {
    throw new Error("Scheduler 3 could not collect either GSC or GA4; see the performance report for provider errors.");
  }
  return {
    path, searchStatus: search.status, analyticsStatus: analytics.status,
    collectionStatus: report.dataQuality.collectionStatus,
    productAcquisition: report.productAcquisition.status,
    persistenceStatus: persistence.status,
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runPerformanceLearning(), null, 2) + "\n"); }
  catch (error) { console.error(`Scheduler 3 failed to write its report: ${error.message}`); process.exitCode = 1; }
}
