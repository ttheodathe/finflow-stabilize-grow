import { readFile, writeFile, mkdir } from "node:fs/promises";
import { assertProductionWritesBlocked } from "../content-ops/safety.mjs";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";
import { runResearchPipeline } from "../research/pipeline.mjs";

const OUTPUT = process.env.SEO_OUTPUT_DIR || "seo-output";
const CONTENT_DIR = "content/blog";
const RESEARCH_DIR = process.env.SEO_RESEARCH_OUTPUT_DIR || "content/operations/research";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function expandPersistedOpportunities(opportunities, schedulerRunId) {
  const candidates = [];
  for (const opportunity of opportunities) {
    if (typeof opportunity.persistedOpportunityId !== "string" || !UUID_PATTERN.test(opportunity.persistedOpportunityId)) {
      throw new Error("Scheduler 2 rejected a persisted opportunity with a missing or invalid UUID.");
    }
    if (opportunity.decision !== "REVIEW_REQUIRED") continue;
    const rows = (opportunity.evidence?.sampleQueries || [])
      .filter(row => typeof row.query === "string" && row.query.trim())
      .slice(0,5);
    for (const row of rows) {
      const source = opportunity.evidence?.source || "UNKNOWN";
      candidates.push({
        id: `${opportunity.id}:${Buffer.from(row.query).toString("base64url").slice(0,18)}`,
        persistedOpportunityId: opportunity.persistedOpportunityId,
        sourceCollectionRunId: schedulerRunId,
        sourceCollectionAt: opportunity.evidence?.sourceCollectionAt || null,
        reportingPeriod: opportunity.evidence?.dateRange || null,
        targetUrl: opportunity.targetUrl,
        targetQuery: row.query,
        metrics: {
          impressions: row.impressions ?? null,
          clicks: row.clicks ?? null,
          ctr: row.ctr ?? null,
          averagePosition: row.position ?? null,
        },
        reportingPeriodEnd: opportunity.evidence?.dateRange?.endDate || null,
        dataSource: source,
        evidenceMode: source === "Google Search Console" && opportunity.sourceRunFixture !== true
          && opportunity.evidence?.evidenceMode !== "FIXTURE"
          && !/\.test$|example\.test|localhost/i.test(new URL(opportunity.targetUrl || "https://invalid.example").hostname)
          ? "LIVE_OR_PERSISTED" : "FIXTURE",
        evidence: {
          source,
          dateRange: opportunity.evidence?.dateRange || null,
          pageMetrics: {
            clicks: opportunity.evidence?.clicks ?? null,
            impressions: opportunity.evidence?.impressions ?? null,
            ctr: opportunity.evidence?.ctr ?? null,
            averagePosition: opportunity.evidence?.averagePosition ?? null,
          },
          sampleQueries: [row],
        },
      });
    }
  }
  return candidates;
}

export async function runContentOperations({
  inputPath = `${OUTPUT}/scheduler-1-opportunities.json`,
  outputDir = OUTPUT, researchDir = RESEARCH_DIR, contentDir = CONTENT_DIR,
  env = process.env, store = createSupabaseSeoStoreFromEnv(env),
  fetchImpl = fetch, now = new Date(), allowFixture = false,
} = {}) {
  assertProductionWritesBlocked(env);
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  if (input.scheduler !== "SEARCH_INTELLIGENCE" || !Array.isArray(input.opportunities)) {
    throw new Error("Scheduler 2 requires a valid Scheduler 1 opportunity report.");
  }
  if (input.persistence?.status !== "PERSISTED" || typeof input.persistence?.schedulerRunId !== "string" || !UUID_PATTERN.test(input.persistence.schedulerRunId)) {
    throw new Error("Scheduler 2 requires Scheduler 1's successfully persisted run ID as a valid UUID; artifact-only evidence is insufficient.");
  }
  if (!store) {
    throw new Error("Scheduler 2 requires the server-side Supabase store to read Scheduler 1's persisted opportunities.");
  }

  const persistedOpportunities = await store.listPersistedOpportunities({
    schedulerRunId: input.persistence.schedulerRunId,
  });
  if (!Array.isArray(persistedOpportunities)) {
    throw new Error("Persisted Scheduler 1 opportunity RPC returned an invalid response.");
  }
  for (const row of persistedOpportunities) {
    if (typeof row.id !== "string" || !UUID_PATTERN.test(row.id)) {
      throw new Error("Scheduler 2 rejected a persisted opportunity with a missing or invalid UUID.");
    }
  }
  const candidates = expandPersistedOpportunities(persistedOpportunities.map(row => ({
    id: row.opportunity_key,
    persistedOpportunityId: row.id,
    sourceRunFixture: row.source_run_output?.fixture === true,
    targetUrl: row.target_url,
    queryText: row.query_text,
    opportunityType: row.opportunity_type,
    score: row.score,
    evidence: row.evidence,
    decision: row.evidence?.decision || "LOW_EVIDENCE",
    createdAt: row.created_at,
  })), input.persistence.schedulerRunId);

  const scheduledFor = now.toISOString().slice(0,10);
  const attempt = Math.max(1, Number.parseInt(env.GITHUB_RUN_ATTEMPT || "1",10) || 1);
  const schedulerRunId = await store.recordRun({
    schedulerKey: "CONTENT_OPERATIONS", scheduledFor, attempt,
    status: "RUNNING", upstreamRunId: input.persistence.schedulerRunId,
    output: { persistedOpportunityCount: persistedOpportunities.length, candidateQueryCount: candidates.length },
  });

  let pipelineResult;
  try {
    pipelineResult = await runResearchPipeline({
      opportunities: candidates, contentDir, outputDir: researchDir,
      fetchImpl, now, store, allowFixture,
    });
    const finalStatus = pipelineResult.readyDraftCount > 0 && pipelineResult.rejectedCount === 0
      ? "SUCCEEDED" : "PARTIAL";
    await store.recordRun({
      schedulerKey: "CONTENT_OPERATIONS", scheduledFor, attempt,
      status: finalStatus, upstreamRunId: input.persistence.schedulerRunId,
      output: {
        persistedOpportunityCount: persistedOpportunities.length,
        candidateQueryCount: candidates.length,
        readyDraftCount: pipelineResult.readyDraftCount,
        rejectedCount: pipelineResult.rejectedCount,
        mode: "DRY_RUN",
        researchReport: pipelineResult.reportPath,
      },
    });
  } catch (error) {
    try {
      await store.recordRun({
        schedulerKey: "CONTENT_OPERATIONS", scheduledFor, attempt,
        status: "FAILED", upstreamRunId: input.persistence.schedulerRunId,
        output: { candidateQueryCount: candidates.length },
        errorSummary: String(error.message || error),
      });
    } catch { /* Keep the original pipeline error visible. */ }
    throw error;
  }

  const report = {
    schemaVersion: 2, scheduler: "CONTENT_OPERATIONS",
    generatedAt: now.toISOString(), mode: "DRY_RUN",
    upstream: {
      scheduler: "SEARCH_INTELLIGENCE",
      schedulerRunId: input.persistence.schedulerRunId,
      status: input.persistence.status,
      dateRange: input.dateRange || null,
    },
    persistedOpportunityCount: persistedOpportunities.length,
    candidateCount: candidates.length,
    readyDraftCount: pipelineResult.readyDraftCount,
    rejectedCount: pipelineResult.rejectedCount,
    results: pipelineResult.results.map(result => ({
      candidate: result.candidate,
      intent: result.intent,
      freshness: result.freshness,
      cannibalization: result.cannibalization,
      existingContentComparison: result.existingContentComparison || [],
      sourceRecords: result.draft?.sourceRecords || [],
      claimMap: result.draft?.claims || [],
      productCapabilities: result.draft?.productEvidence || null,
      draft: result.draft ? {
        title: result.draft.title, description: result.draft.description,
        slug: result.draft.slug, publicationStatus: result.draft.publicationStatus,
        authorStatus: result.draft.authorStatus, contentHash: result.contentHash || null,
        path: result.draftPath || null, markdown: result.draft.content,
      } : null,
      quality: result.quality,
      status: result.status,
      rejectionReasons: result.rejectionReasons,
      editorialReviewQuestions: result.editorialReviewQuestions || [],
      persistence: result.persistence || null,
    })),
    researchReportPath: pipelineResult.reportPath,
    productionMutation: "BLOCKED",
    persistence: { status: "PERSISTED", schedulerRunId },
    limitations: [
      "Scheduler 2 reads opportunity rows directly from Supabase using the upstream Scheduler 1 run ID; fixture evidence is blocked in scheduled mode.",
      "Source relevance and originality checks are deterministic screening, not semantic fact-checking.",
      "Every generated draft requires human review and authenticated approval before any staging adapter can be invoked.",
      "No article Markdown under content/blog is created or updated by this scheduler.",
    ],
  };
  await mkdir(outputDir,{recursive:true});
  const reportPath = `${outputDir}/scheduler-2-content-queue.json`;
  await writeFile(reportPath,JSON.stringify(report,null,2)+"\n",{flag:"w"});
  return {
    path: reportPath, queueCount: candidates.length,
    readyDraftCount: pipelineResult.readyDraftCount,
    rejectedCount: pipelineResult.rejectedCount,
    researchReportPath: pipelineResult.reportPath,
    mode: report.mode, persistenceStatus: report.persistence.status,
  };
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  try { process.stdout.write(JSON.stringify(await runContentOperations({ inputPath: process.argv[2] }),null,2)+"\n"); }
  catch (error) { console.error(`Scheduler 2 failed: ${error.message}`); process.exitCode=1; }
}
