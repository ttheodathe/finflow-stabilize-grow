const DEFAULT_SCHEMA = "public";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireUuid(value, label) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${label} did not return a valid UUID.`);
  }
  return value;
}

export function createSupabaseSeoStore({ url, serviceRoleKey, fetchImpl = fetch }) {
  if (!url || !serviceRoleKey) throw new Error("Supabase SEO persistence requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const base = new URL(url);
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
    throw new Error("Supabase persistence URL must use HTTPS outside localhost.");
  }

  async function rpc(name, payload) {
    if (!/^seo_ops_[a-z_]+$/.test(name)) throw new Error("Invalid SEO persistence RPC name.");
    const response = await fetchImpl(`${base.origin}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        "content-type": "application/json",
        accept: "application/json",
        "accept-profile": DEFAULT_SCHEMA,
        "content-profile": DEFAULT_SCHEMA,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase SEO persistence RPC ${name} failed (HTTP ${response.status}): ${detail.slice(0, 300)}`);
    }
    return response.json();
  }

  return Object.freeze({
    async recordRun({ schedulerKey, scheduledFor, attempt = 1, status, output = {}, upstreamRunId = null, errorSummary = null }) {
      if (upstreamRunId !== null) requireUuid(upstreamRunId, "Upstream scheduler run");
      return requireUuid(await rpc("seo_ops_record_run", {
        p_scheduler_key: schedulerKey, p_scheduled_for: scheduledFor, p_attempt: attempt,
        p_status: status, p_output: output, p_upstream_run_id: upstreamRunId,
        p_error_summary: errorSummary,
      }), "Scheduler run persistence");
    },
    async listPersistedOpportunities({ schedulerRunId }) {
      requireUuid(schedulerRunId, "Persisted Scheduler 1 run ID");
      const rows = await rpc("seo_ops_get_opportunities", { p_scheduler_run_id: schedulerRunId });
      if (!Array.isArray(rows)) throw new Error("Persisted opportunity readback returned an invalid response.");
      for (const row of rows) requireUuid(row.id, "Persisted opportunity record");
      return rows;
    },
    async recordOpportunity({ opportunityKey, schedulerRunId, targetUrl, queryText = null, opportunityType, score, evidence }) {
      requireUuid(schedulerRunId, "Scheduler 1 run ID");
      return requireUuid(await rpc("seo_ops_record_opportunity", {
        p_opportunity_key: opportunityKey, p_scheduler_run_id: schedulerRunId,
        p_target_url: targetUrl, p_query_text: queryText, p_opportunity_type: opportunityType,
        p_score: score, p_evidence: evidence,
      }), "Opportunity persistence");
    },
    async recordPerformanceSnapshot({ snapshotKey, schedulerRunId, periodStart, periodEnd, source, metrics }) {
      if (schedulerRunId != null) requireUuid(schedulerRunId, "Performance snapshot scheduler run ID");
      return requireUuid(await rpc("seo_ops_record_performance_snapshot", {
        p_snapshot_key: snapshotKey, p_scheduler_run_id: schedulerRunId,
        p_period_start: periodStart, p_period_end: periodEnd, p_source: source, p_metrics: metrics,
      }), "Performance snapshot persistence");
    },
    async recordArticlePerformanceSnapshot({ snapshotKey, operationId = null, revisionId = null, slug, canonicalUrl, source, periodStart, periodEnd, metrics, measurementScope = "PAGE_LEVEL_DIRECT", revisionAttribution = "UNKNOWN" }) {
      if (operationId != null) requireUuid(operationId, "Article performance operation ID");
      if (revisionId != null) requireUuid(revisionId, "Article performance revision ID");
      if (typeof snapshotKey !== "string" || !snapshotKey.trim()) throw new Error("Article performance snapshot key is required.");
      return requireUuid(await rpc("seo_ops_record_article_performance", {
        p_snapshot_key: snapshotKey, p_operation_id: operationId, p_revision_id: revisionId,
        p_slug: slug, p_canonical_url: canonicalUrl, p_source: source,
        p_period_start: periodStart, p_period_end: periodEnd, p_metrics: metrics,
        p_measurement_scope: measurementScope, p_revision_attribution: revisionAttribution,
      }), "Article performance snapshot persistence");
    },
    async recordActivationSnapshot({ snapshotDate, registeredUsers, onboardingCompletions, activatedUsers, returningActivatedUsers, definitionVersion, sourceWatermark, limitations = [] }) {
      return requireUuid(await rpc("seo_ops_record_activation_snapshot", {
        p_snapshot_date: snapshotDate, p_registered_users: registeredUsers,
        p_onboarding_completions: onboardingCompletions, p_activated_users: activatedUsers,
        p_returning_activated_users: returningActivatedUsers, p_definition_version: definitionVersion,
        p_source_watermark: sourceWatermark, p_limitations: limitations,
      }), "Activation snapshot persistence");
    },
    async recordContentOperation({ operationKey, operationType, targetPath, slug, status = "PROPOSED", payload = {}, proposedContentHash = null, expectedBlobSha = null }) {
      return requireUuid(await rpc("seo_ops_record_content_operation", {
        p_operation_key: operationKey, p_operation_type: operationType,
        p_target_path: targetPath, p_slug: slug, p_status: status, p_payload: payload,
        p_proposed_content_hash: proposedContentHash, p_expected_blob_sha: expectedBlobSha,
      }), "Content operation persistence");
    },
    async recordResearchRecord({ opportunityId, sourceUrl, sourceTitle, sourcePublishedAt = null, retrievedAt, supportedClaims = [], unresolvedClaims = [] }) {
      requireUuid(opportunityId, "Research opportunity ID");
      return requireUuid(await rpc("seo_ops_record_research_record", {
        p_opportunity_id: opportunityId, p_source_url: sourceUrl, p_source_title: sourceTitle,
        p_source_published_at: sourcePublishedAt, p_retrieved_at: retrievedAt,
        p_supported_claims: supportedClaims, p_unresolved_claims: unresolvedClaims,
      }), "Research record persistence");
    },
    async recordContentRevision({ operationId, revisionNumber, contentHash, markdown, revisionState = "PROPOSED" }) {
      requireUuid(operationId, "Content revision operation ID");
      return requireUuid(await rpc("seo_ops_record_content_revision", {
        p_operation_id: operationId, p_revision_number: revisionNumber,
        p_content_hash: contentHash, p_markdown: markdown, p_revision_state: revisionState,
      }), "Content revision persistence");
    },
    async getContentOperation({ operationId }) {
      requireUuid(operationId, "Content operation readback ID");
      const rows = await rpc("seo_ops_get_content_operation", { p_operation_id: operationId });
      if (!Array.isArray(rows)) throw new Error("Content operation readback returned an invalid response.");
      return rows[0] || null;
    },
    async listResearchRecords({ opportunityId }) {
      requireUuid(opportunityId, "Research opportunity readback ID");
      const rows = await rpc("seo_ops_get_research_records", { p_opportunity_id: opportunityId });
      if (!Array.isArray(rows)) throw new Error("Research record readback returned an invalid response.");
      for (const row of rows) requireUuid(row.id, "Research record readback");
      return rows;
    },
    async listContentRevisions({ operationId }) {
      requireUuid(operationId, "Content revision readback ID");
      const rows = await rpc("seo_ops_get_content_revisions", { p_operation_id: operationId });
      if (!Array.isArray(rows)) throw new Error("Content revision readback returned an invalid response.");
      for (const row of rows) requireUuid(row.id, "Content revision readback");
      return rows;
    },
  });
}

export function createSupabaseSeoStoreFromEnv(env = process.env, options = {}) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const persistenceRequired = env.SEO_PERSISTENCE_REQUIRED === "true";
  const allowedProjectRef = env.SEO_OPS_ALLOWED_PROJECT_REF;

  if (persistenceRequired && (!url || !serviceRoleKey)) {
    throw new Error("Required SEO persistence needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (persistenceRequired && !allowedProjectRef) {
    throw new Error("Required SEO persistence must declare SEO_OPS_ALLOWED_PROJECT_REF.");
  }
  if (allowedProjectRef) {
    if (!/^[a-z0-9]{20}$/.test(allowedProjectRef)) {
      throw new Error("SEO_OPS_ALLOWED_PROJECT_REF must be a 20-character Supabase project reference.");
    }
    if (url && new URL(url).hostname !== `${allowedProjectRef}.supabase.co`) {
      throw new Error("Supabase URL does not match the explicitly allowed SEO acceptance project.");
    }
  }
  if (!url && !serviceRoleKey) return null;
  return createSupabaseSeoStore({ url, serviceRoleKey, ...options });
}
