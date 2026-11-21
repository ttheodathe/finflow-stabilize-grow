import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const issuer = "https://token.actions.githubusercontent.com";
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function verifyPublisherIdentity(request: Request) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("GitHub Actions OIDC token is required.");

  const audience = Deno.env.get("PUBLISHER_OIDC_AUDIENCE") || "finflowtrack-seo-publisher";
  const allowedRepository = Deno.env.get("PUBLISHER_ALLOWED_REPOSITORY") || "ttheodathe/finflow-stabilize-grow";
  const allowedRepositoryId = Deno.env.get("PUBLISHER_ALLOWED_REPOSITORY_ID") || "1302272765";
  const allowedRef = Deno.env.get("PUBLISHER_ALLOWED_REF") || "refs/heads/main";
  const allowedWorkflowRef = Deno.env.get("PUBLISHER_ALLOWED_WORKFLOW_REF");
  if (!allowedWorkflowRef) throw new Error("Publisher workflow identity is not configured.");

  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  if (
    payload.repository !== allowedRepository ||
    String(payload.repository_id || "") !== allowedRepositoryId ||
    payload.ref !== allowedRef ||
    payload.workflow_ref !== allowedWorkflowRef ||
    !["schedule", "workflow_dispatch"].includes(String(payload.event_name || ""))
  ) {
    throw new Error("GitHub Actions identity is not authorized to publish.");
  }
  return payload;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    await verifyPublisherIdentity(request);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Publisher identity rejected" }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "Publisher service is not configured" }, 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (body.action === "claim") {
    const claimId = typeof body.claimId === "string" ? body.claimId : "";
    if (!/^[0-9a-f-]{36}$/i.test(claimId)) return json({ error: "Invalid claim id" }, 400);

    const { data, error } = await admin.rpc("seo_ops_claim_next_article_for_publication", {
      p_claim_id: claimId,
    });
    if (error) return json({ error: "Publication claim failed", code: error.code || "CLAIM_FAILED" }, 409);
    if (!data) return json({ claimed: false });

    const { data: authorRows, error: authorError } = await admin
      .schema("seo_ops")
      .from("editorial_authors")
      .select("author_name")
      .eq("is_active", true);
    if (authorError) return json({ error: "Active author allowlist could not be read" }, 500);

    return json({
      claimed: true,
      claim: data,
      allowedAuthors: (authorRows || []).map((row: { author_name: string }) => row.author_name),
    });
  }

  if (body.action === "update") {
    const claimId = typeof body.claimId === "string" ? body.claimId : "";
    const status = typeof body.status === "string" ? body.status : "";
    if (!/^[0-9a-f-]{36}$/i.test(claimId)) return json({ error: "Invalid claim id" }, 400);

    const allowedStatuses = ["PULL_REQUEST_OPEN", "MERGED", "DEPLOYMENT_READY", "URL_VERIFIED", "FAILED", "STALE"];
    if (!allowedStatuses.includes(status)) return json({ error: "Invalid publication status" }, 400);

    const { data, error } = await admin.rpc("seo_ops_update_article_publication", {
      p_claim_id: claimId,
      p_status: status,
      p_github_branch: typeof body.githubBranch === "string" ? body.githubBranch : null,
      p_github_pr_number: Number.isInteger(body.githubPrNumber) ? body.githubPrNumber : null,
      p_commit_sha: typeof body.commitSha === "string" ? body.commitSha : null,
      p_published_content_hash: typeof body.publishedContentHash === "string" ? body.publishedContentHash : null,
      p_deployment_url: typeof body.deploymentUrl === "string" ? body.deploymentUrl : null,
      p_error_message: typeof body.errorMessage === "string" ? body.errorMessage.slice(0, 2000) : null,
    });
    if (error || data !== true) {
      return json({ error: "Publication state update failed", code: error?.code || "STATE_UPDATE_FAILED" }, 409);
    }
    return json({ updated: true, claimId, status });
  }

  return json({ error: "Unsupported publisher action" }, 400);
});