const DEFAULT_SCHEMA = "public";

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
        authorization: `Bearer ${serviceRoleKey}`,
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
    recordRun({ schedulerKey, scheduledFor, attempt = 1, status, output = {}, upstreamRunId = null, errorSummary = null }) {
      return rpc("seo_ops_record_run", {
        p_scheduler_key: schedulerKey, p_scheduled_for: scheduledFor, p_attempt: attempt,
        p_status: status, p_output: output, p_upstream_run_id: upstreamRunId,
        p_error_summary: errorSummary,
      });
    },
    listPersistedOpportunities({ schedulerRunId }) {
      if (typeof schedulerRunId !== "string" || !/^[0-9a-f-]{36}$/i.test(schedulerRunId)) {
        throw new Error("A valid persisted Scheduler 1 run ID is required.");
      }
      return rpc("seo_ops_get_opportunities", { p_scheduler_run_id: schedulerRunId });
    },
    recordOpportunity({ opportunityKey, schedulerRunId, targetUrl, queryText = null, opportunityType, score, evidence }) {
      return rpc("seo_ops_record_opportunity", {
        p_opportunity_key: opportunityKey, p_scheduler_run_id: schedulerRunId,
        p_target_url: targetUrl, p_query_text: queryText, p_opportunity_type: opportunityType,
        p_score: score, p_evidence: evidence,
      });
    },
    recordPerformanceSnapshot({ snapshotKey, schedulerRunId, periodStart, periodEnd, source, metrics }) {
      return rpc("seo_ops_record_performance_snapshot", {
        p_snapshot_key: snapshotKey, p_scheduler_run_id: schedulerRunId,
        p_period_start: periodStart, p_period_end: periodEnd, p_source: source, p_metrics: metrics,
      });
    },
    recordActivationSnapshot({ snapshotDate, registeredUsers, onboardingCompletions, activatedUsers, returningActivatedUsers, definitionVersion, sourceWatermark, limitations = [] }) {
      return rpc("seo_ops_record_activation_snapshot", {
        p_snapshot_date: snapshotDate, p_registered_users: registeredUsers,
        p_onboarding_completions: onboardingCompletions, p_activated_users: activatedUsers,
        p_returning_activated_users: returningActivatedUsers, p_definition_version: definitionVersion,
        p_source_watermark: sourceWatermark, p_limitations: limitations,
      });
    },
    recordContentOperation({ operationKey, operationType, targetPath, slug, status = "PROPOSED", payload = {}, proposedContentHash = null, expectedBlobSha = null }) {
      return rpc("seo_ops_record_content_operation", {
        p_operation_key: operationKey, p_operation_type: operationType,
        p_target_path: targetPath, p_slug: slug, p_status: status, p_payload: payload,
        p_proposed_content_hash: proposedContentHash, p_expected_blob_sha: expectedBlobSha,
      });
    },
  });
}

export function createSupabaseSeoStoreFromEnv(env = process.env, options = {}) {
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url && !serviceRoleKey) return null;
  return createSupabaseSeoStore({ url, serviceRoleKey, ...options });
}
