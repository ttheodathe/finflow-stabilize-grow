import { createClient } from "npm:@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.finflowtrack.com",
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: "Approval service is not configured" }, 503);
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    return json({ error: "A signed-in reviewer session is required" }, 401);
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !userData.user?.id) {
    return json({ error: "Reviewer session could not be verified" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const operationId = String(body.operationId || "");
  const revisionId = String(body.revisionId || "");
  const contentHash = String(body.contentHash || "");
  const decision = String(body.decision || "");
  const reviewNotes = typeof body.reviewNotes === "string" ? body.reviewNotes.slice(0, 4000) : null;

  if (
    !/^[0-9a-f-]{36}$/i.test(operationId) ||
    !/^[0-9a-f-]{36}$/i.test(revisionId) ||
    !/^[a-f0-9]{64}$/.test(contentHash) ||
    !["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(decision)
  ) {
    return json({ error: "Approval payload is invalid" }, 400);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("seo_ops_record_article_approval", {
    p_operation_id: operationId,
    p_revision_id: revisionId,
    p_content_hash: contentHash,
    p_reviewer_user_id: userData.user.id,
    p_authenticated_subject: userData.user.id,
    p_decision: decision,
    p_review_notes: reviewNotes,
  });
  if (error) {
    return json(
      {
        error: "Editorial decision was not accepted",
        code: error.code || "APPROVAL_REJECTED",
      },
      403,
    );
  }

  const { data: rows, error: readError } = await admin.rpc("seo_ops_get_article_approval", {
    p_approval_id: data,
  });
  const approval = Array.isArray(rows) ? rows[0] : null;
  if (
    readError ||
    !approval ||
    approval.id !== data ||
    approval.reviewer_user_id !== userData.user.id ||
    approval.content_hash !== contentHash ||
    approval.decision !== decision
  ) {
    return json(
      {
        error: "Approval persistence readback did not confirm the exact authenticated decision",
      },
      500,
    );
  }

  return json({
    approvalId: data,
    decision,
    contentHash,
    reviewerUserId: approval.reviewer_user_id,
  });
});
