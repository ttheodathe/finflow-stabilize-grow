import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import matter from "gray-matter";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseSeoStoreFromEnv } from "../persistence/supabase-store.mjs";
import { collect } from "../collect.mjs";
import { runContentOperations } from "../schedulers/content-operations.mjs";
import { runSearchIntelligence } from "../schedulers/search-intelligence.mjs";

const ACCEPTANCE_PROJECT_REF = "bufbyfwstdqvwnkhyrea";
const HISTORICAL_RUN_ID = "44448533423";
const HISTORICAL_ARTIFACT_ID = "14494691265";
const HISTORICAL_SOURCE_COMMIT = "815f9df90b3581071f9864cf7d984b43f9939cbe";
const HISTORICAL_ARTIFACT_SHA256 = "b44222f584e963e3de17f450fee8dba68c6b1586cbbbf8f025973c2c0c6eff83";
const HISTORICAL_FETCHED_AT = "2026-11-19T03:02:08.554Z";
const HISTORICAL_START = "2026-10-19";
const HISTORICAL_END = "2026-11-15";
const TARGET_URL = "https://www.finflowtrack.com/blog/free-accounting-software-for-small-business";
const TARGET_QUERY = "free business accounting apps worth considering";
const TARGET_SLUG = "free-accounting-software-for-small-business";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertProductionSafeguards() {
  assert.equal(process.env.SEO_OPS_ALLOWED_PROJECT_REF, ACCEPTANCE_PROJECT_REF);
  assert.equal(process.env.DRY_RUN, "true");
  assert.equal(process.env.PUBLISH_ENABLED, "false");
  assert.equal(process.env.CONTENT_UPDATE_ENABLED, "false");
  assert.equal(process.env.PRODUCTION_CONTENT_WRITE_ALLOWED, "false");
}
function assertAcceptanceProject() {
  assert.ok(process.env.SUPABASE_URL, "SUPABASE_URL must be configured for the acceptance project.");
  assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, "Acceptance Supabase service-role credential is required.");
  assert.equal(process.env.SEO_ACCEPTANCE_WRITE_AUTHORIZED, "true", "Acceptance writes require explicit SEO_ACCEPTANCE_WRITE_AUTHORIZED=true.");
  const projectUrl = new URL(process.env.SUPABASE_URL);
  assert.equal(projectUrl.hostname.split(".")[0], ACCEPTANCE_PROJECT_REF, "Refusing to write outside the isolated acceptance Supabase project.");
}

const artifactPath = process.argv[2];
assert.ok(artifactPath, "Pass the downloaded historical GSC artifact JSON path.");
assertProductionSafeguards();

const originalBytes = await readFile(artifactPath);
const actualArtifactSha256 = createHash("sha256").update(originalBytes).digest("hex");
assert.equal(actualArtifactSha256, HISTORICAL_ARTIFACT_SHA256, "Original historical GSC JSON SHA-256 does not match its recorded provenance.");
const original = JSON.parse(originalBytes.toString("utf8"));
assert.equal(original.fetchedAt, HISTORICAL_FETCHED_AT, "Historical artifact retrieval timestamp changed.");
assert.equal(original.dateRange?.startDate, HISTORICAL_START);
assert.equal(original.dateRange?.endDate, HISTORICAL_END);
assert.ok(Array.isArray(original.gsc?.pages) && Array.isArray(original.gsc?.pageQueries));

const pageRows = original.gsc.pages.filter(row => row.page === TARGET_URL);
const pageQueryRows = original.gsc.pageQueries.filter(row => row.page === TARGET_URL);
assert.ok(pageRows.length > 0, "Historical GSC artifact does not contain the target landing page.");
assert.ok(pageQueryRows.some(row => row.query === TARGET_QUERY), "Historical GSC artifact does not contain the selected software-selection query.");

const dailyQueryRows = pageQueryRows.filter(row => row.query === TARGET_QUERY && row.date >= "2026-11-12" && row.date <= "2026-11-15");
assert.equal(dailyQueryRows.length, 4, "The selected query must have exactly four daily rows from 12–15 November 2026.");
const historicalClicks = dailyQueryRows.reduce((sum,row)=>sum+(Number.isFinite(row.clicks)?row.clicks:0),0);
const historicalImpressions = dailyQueryRows.reduce((sum,row)=>sum+(Number.isFinite(row.impressions)?row.impressions:0),0);
const historicalWeightedPosition = dailyQueryRows.reduce((sum,row)=>sum+(Number.isFinite(row.position)&&Number.isFinite(row.impressions)?row.position*row.impressions:0),0);
const historicalQueryMetrics = {
  clicks: historicalClicks,
  impressions: historicalImpressions,
  ctr: historicalImpressions > 0 ? historicalClicks / historicalImpressions : 0,
  position: historicalImpressions > 0 ? historicalWeightedPosition / historicalImpressions : null,
};
assert.equal(historicalQueryMetrics.clicks,0);
assert.equal(historicalQueryMetrics.impressions,31);
assert.ok(Math.abs(historicalQueryMetrics.position - 9.774193548387096) < 0.001);

const hasAcceptanceSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
if (!hasAcceptanceSupabase) {
  const freshDir = path.resolve("seo-output/acceptance/fresh-readonly");
  let freshReadOnlyCollection = { status: "UNAVAILABLE_OR_FAILED" };
  try {
    const freshResult = await collect({ outputDir: freshDir });
    const freshSnapshot = JSON.parse(await readFile(freshResult.file,"utf8"));
    freshReadOnlyCollection = {
      status: "COLLECTED_READ_ONLY",
      file: freshResult.file,
      fetchedAt: freshSnapshot.fetchedAt,
      dateRange: freshSnapshot.dateRange,
      gscCounts: {
        pages: freshSnapshot.gsc?.pages?.length || 0,
        queries: freshSnapshot.gsc?.queries?.length || 0,
        pageQueries: freshSnapshot.gsc?.pageQueries?.length || 0,
      },
      supplementaryAnalytics: {
        status: freshSnapshot.sourceStatus?.ga4 || "UNKNOWN",
        error: freshSnapshot.sourceErrors?.ga4 || null,
      },
    };
  } catch (error) {
    freshReadOnlyCollection = { status: "UNAVAILABLE_OR_FAILED", error: String(error.message || error) };
  }
  const blockedSummary = {
    status: "BLOCKED_MISSING_ACCEPTANCE_SUPABASE_CREDENTIALS",
    blocker: "GitHub Actions did not provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The historical artifact was verified, but no acceptance database write or Scheduler 2 execution was attempted.",
    historicalArtifact: {
      workflowRunId: HISTORICAL_RUN_ID, fetchedAt: original.fetchedAt,
      reportingPeriod: original.dateRange, evidenceMode: "HISTORICAL_GSC_ARTIFACT",
      targetUrl: TARGET_URL, query: TARGET_QUERY, metrics: historicalQueryMetrics,
    },
    freshReadOnlyCollection,
    productionSafeguards: {
      DRY_RUN: process.env.DRY_RUN, PUBLISH_ENABLED: process.env.PUBLISH_ENABLED,
      CONTENT_UPDATE_ENABLED: process.env.CONTENT_UPDATE_ENABLED,
      PRODUCTION_CONTENT_WRITE_ALLOWED: process.env.PRODUCTION_CONTENT_WRITE_ALLOWED,
      acceptanceProjectRef: ACCEPTANCE_PROJECT_REF, productionChanged: false,
    },
  };
  await mkdir(path.resolve("seo-output/acceptance"),{recursive:true});
  await writeFile(path.resolve("seo-output/acceptance/acceptance-summary.json"),JSON.stringify(blockedSummary,null,2)+"\n");
  console.log(JSON.stringify(blockedSummary,null,2));
  process.exitCode = 2;
}

assertAcceptanceProject();
const store = createSupabaseSeoStoreFromEnv(process.env);
assert.ok(store, "Acceptance Supabase store could not be configured.");

const historicalDir = path.resolve("seo-output/acceptance/historical");
await mkdir(historicalDir, { recursive: true });
const historicalSnapshotPath = path.join(historicalDir, "historical-gsc-snapshot.json");
const historicalSnapshot = {
  ...original,
  evidenceMode: "HISTORICAL_GSC_ARTIFACT",
  historicalProvenance: {
    artifactId: HISTORICAL_ARTIFACT_ID,
    workflowRunId: HISTORICAL_RUN_ID,
    sourceCommit: HISTORICAL_SOURCE_COMMIT,
    sha256: HISTORICAL_ARTIFACT_SHA256,
    property: original.property.gsc,
    reportingPeriod: original.dateRange,
    retrievedAt: original.fetchedAt,
    evidenceMode: "HISTORICAL_GSC_ARTIFACT",
  },
  gsc: { ...original.gsc, pages: pageRows, pageQueries: pageQueryRows },
};
await writeFile(historicalSnapshotPath, JSON.stringify(historicalSnapshot, null, 2) + "\n");

const historicalS1 = await runSearchIntelligence({
  dateRange: original.dateRange,
  collectFn: async () => ({ file: historicalSnapshotPath }),
  outputDir: historicalDir,
  runAttempt: 100000 + Number(process.env.GITHUB_RUN_NUMBER || 1) * 10 + Number(process.env.GITHUB_RUN_ATTEMPT || 1),
});
assert.equal(historicalS1.persistenceStatus, "PERSISTED");
assert.equal(historicalS1.evidenceMode, "HISTORICAL_GSC_ARTIFACT");
const historicalReport = JSON.parse(await readFile(historicalS1.path, "utf8"));
const historicalRunId = historicalReport.persistence?.schedulerRunId;
assert.match(historicalRunId || "", UUID);
assert.equal(historicalReport.evidenceMode, "HISTORICAL_GSC_ARTIFACT");
assert.ok(historicalReport.runAttempt >= 100000);
assert.deepEqual(historicalReport.historicalProvenance, historicalSnapshot.historicalProvenance);

const persisted = await store.listPersistedOpportunities({ schedulerRunId: historicalRunId });
const opportunity = persisted.find(row =>
  row.target_url === TARGET_URL &&
  (row.evidence?.sampleQueries || []).some(query => query.query === TARGET_QUERY)
);
assert.ok(opportunity, "Scheduler 1 did not persist the genuine target-page opportunity.");
assert.match(opportunity.id || "", UUID);
const queryEvidence = opportunity.evidence.sampleQueries.find(query => query.query === TARGET_QUERY);
assert.equal(queryEvidence.impressions, 31);
assert.equal(queryEvidence.clicks, 0);
assert.equal(queryEvidence.ctr, 0);
assert.ok(Math.abs(Number(queryEvidence.position) - 9.774193548387096) < 0.001);
assert.equal(opportunity.evidence.evidenceMode, "HISTORICAL_GSC_ARTIFACT");
assert.deepEqual(opportunity.evidence.historicalProvenance, historicalSnapshot.historicalProvenance);
assert.equal(opportunity.evidence.sourceCollectionAt, HISTORICAL_FETCHED_AT);
assert.deepEqual(opportunity.evidence.dateRange, original.dateRange);

const filteredStore = Object.freeze({
  ...store,
  listPersistedOpportunities: async ({ schedulerRunId }) => {
    assert.equal(schedulerRunId, historicalRunId, "Scheduler 2 requested an unexpected Scheduler 1 run ID.");
    const rows = await store.listPersistedOpportunities({ schedulerRunId });
    const row = rows.find(item => item.id === opportunity.id);
    assert.ok(row, "Independent persisted-opportunity readback lost the target UUID.");
    return [{
      ...row,
      query_text: TARGET_QUERY,
      evidence: { ...row.evidence, sampleQueries: [queryEvidence] },
    }];
  },
});

const historicalS2 = await runContentOperations({
  inputPath: historicalS1.path,
  outputDir: historicalDir,
  researchDir: path.join(historicalDir, "research"),
  contentDir: "content/blog",
  env: process.env,
  store: filteredStore,
  allowFixture: false,
  runAttempt: historicalReport.runAttempt + 2,
});
const contentReport = JSON.parse(await readFile(historicalS2.path, "utf8"));
const accepted = contentReport.results.find(item =>
  item.candidate?.targetUrl === TARGET_URL &&
  item.candidate?.targetQuery === TARGET_QUERY
);
assert.ok(accepted, "Scheduler 2 did not process the exact persisted GSC opportunity and query.");
assert.equal(accepted.editorialDecision, "UPDATE_EXISTING_ARTICLE");
assert.equal(accepted.cannibalization?.decision, "UPDATE_EXISTING_ARTICLE");
assert.equal(accepted.sourcePackCompatibility?.compatible, true);
assert.equal(accepted.candidate?.evidenceMode, "HISTORICAL_GSC_ARTIFACT");
assert.equal(accepted.candidate?.historicalProvenance?.sha256, HISTORICAL_ARTIFACT_SHA256);
assert.equal(accepted.status, "DRAFT_READY_FOR_HUMAN_REVIEW");
assert.equal(accepted.persistence?.status, "PERSISTED");
assert.match(contentReport.persistence?.schedulerRunId || "", UUID);
assert.equal(contentReport.upstream?.schedulerRunId, historicalRunId);
assert.notEqual(accepted.persistence?.schedulerRunId, historicalRunId);
assert.equal(accepted.persistence?.independentReadback?.verified, true);
assert.equal(accepted.candidate?.metrics?.impressions, 31);
assert.equal(accepted.candidate?.metrics?.clicks, 0);
assert.ok(Math.abs(Number(accepted.candidate?.metrics?.averagePosition) - 9.774193548387096) < 0.001);
assert.match(accepted.draft?.slug || "", new RegExp("^" + TARGET_SLUG + "$"));
assert.ok(accepted.persistence?.operationId && UUID.test(accepted.persistence.operationId));
assert.ok(accepted.persistence?.revisionId && UUID.test(accepted.persistence.revisionId));
assert.ok(Array.isArray(accepted.persistence?.researchRecordIds) && accepted.persistence.researchRecordIds.length >= 4);
assert.ok(accepted.draft?.path, "The complete editorial draft file path is missing.");

const originalArticleMarkdown = await readFile(path.resolve("content/blog", `${TARGET_SLUG}.md`), "utf8");
const originalArticleHash = createHash("sha256").update(originalArticleMarkdown).digest("hex");
const originalArticle = matter(originalArticleMarkdown);
const operation = await store.getContentOperation({ operationId: accepted.persistence.operationId });
assert.equal(operation?.payload?.workflowState, "READY_FOR_HUMAN_REVIEW");
assert.equal(operation?.target_path, `content/blog/${TARGET_SLUG}.md`);
assert.equal(operation?.payload?.persistedOpportunityId, opportunity.id);
assert.equal(operation?.payload?.evidenceMode, "HISTORICAL_GSC_ARTIFACT");
assert.equal(operation?.payload?.candidate?.historicalProvenance?.sha256, HISTORICAL_ARTIFACT_SHA256);
const research = await store.listResearchRecords({ opportunityId: opportunity.id });
assert.ok(accepted.persistence.researchRecordIds.every(id => research.some(record => record.id === id)));
assert.ok(research.some(record => (record.supported_claims || []).length > 0));
const sourceRecords = operation.payload.sources || [];
const claimMap = operation.payload.claims || [];
assert.ok(sourceRecords.length >= 4);
for (const source of sourceRecords) {
  assert.ok(source.url && source.sourceTitle && source.publisher && source.retrievedAt && source.excerpt);
  assert.equal(source.status, "RETRIEVED_RELEVANT", `Unverified research source: ${source.url}`);
}
assert.ok(claimMap.length >= 4);
for (const claim of claimMap) {
  assert.ok(Array.isArray(claim.sourceUrls) && claim.sourceUrls.length > 0, `Unmapped claim: ${claim.id}`);
  for (const sourceUrl of claim.sourceUrls) {
    const sourceRecord = research.find(record => record.source_url === sourceUrl);
    assert.ok(sourceRecord, `Missing persisted source: ${sourceUrl}`);
    const persistedClaim = [...(sourceRecord.supported_claims || []), ...(sourceRecord.unresolved_claims || [])].find(item => item.id === claim.id);
    assert.ok(persistedClaim, `Missing source-to-claim mapping: ${claim.id}`);
  }
}
const revisions = await store.listContentRevisions({ operationId: accepted.persistence.operationId });
const revision = revisions.find(item => item.id === accepted.persistence.revisionId);
assert.ok(revision, "Independent revision readback failed.");
assert.ok(revision.markdown.includes("Free Accounting Software Options: A Practical Comparison"));
assert.ok(revision.markdown.includes("What Does \"Free Accounting Software\" Actually Mean?"));
const draftMarkdown = await readFile(accepted.draft.path, "utf8");
assert.ok(draftMarkdown.includes("publicationStatus: draft"));
assert.ok(draftMarkdown.includes("ZipBooks Starter"));
assert.ok(draftMarkdown.includes("What Does \"Free Accounting Software\" Actually Mean?"));

let freshCollection = { status: "NOT_ATTEMPTED" };
try {
  const freshDir = path.resolve("seo-output/acceptance/fresh");
  const freshResult = await collect({ outputDir: freshDir });
  const freshSnapshot = JSON.parse(await readFile(freshResult.file, "utf8"));
  freshCollection = {
    status: "COLLECTED_READ_ONLY", dateRange: freshSnapshot.dateRange, fetchedAt: freshSnapshot.fetchedAt,
    gscCounts: { pages: freshSnapshot.gsc?.pages?.length || 0, queries: freshSnapshot.gsc?.queries?.length || 0, pageQueries: freshSnapshot.gsc?.pageQueries?.length || 0 },
    supplementaryAnalytics: { status: freshSnapshot.sourceStatus?.ga4 || "UNKNOWN", error: freshSnapshot.sourceErrors?.ga4 || null },
  };
} catch (error) {
  freshCollection = { status: "UNAVAILABLE_OR_FAILED", error: String(error.message || error) };
}

const summary = {
  status: "HISTORICAL_GSC_TO_DRAFT_ACCEPTANCE_PASSED",
  historicalArtifact: {
    workflowRunId: HISTORICAL_RUN_ID,
    fetchedAt: original.fetchedAt,
    reportingPeriod: original.dateRange,
    evidenceMode: "HISTORICAL_GSC_ARTIFACT",
    schedulerRunId: historicalRunId,
    opportunityId: opportunity.id,
    targetUrl: TARGET_URL,
    query: TARGET_QUERY,
    metrics: queryEvidence,
  },
  scheduler2: {
    editorialDecision: accepted.editorialDecision,
    sourcePack: accepted.sourcePackCompatibility,
    contentOperationId: accepted.persistence.operationId,
    researchRecordIds: accepted.persistence.researchRecordIds,
    revisionId: accepted.persistence.revisionId,
    draftPath: accepted.draft.path,
    independentReadback: accepted.persistence.independentReadback,
    workflowState: operation.payload.workflowState,
  },
  freshReadOnlyCollection: freshCollection,
  productionSafeguards: {
    DRY_RUN: process.env.DRY_RUN,
    PUBLISH_ENABLED: process.env.PUBLISH_ENABLED,
    CONTENT_UPDATE_ENABLED: process.env.CONTENT_UPDATE_ENABLED,
    PRODUCTION_CONTENT_WRITE_ALLOWED: process.env.PRODUCTION_CONTENT_WRITE_ALLOWED,
    projectRef: ACCEPTANCE_PROJECT_REF,
    productionChanged: false,
  },
};
await writeFile(path.resolve("seo-output/acceptance/acceptance-summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
