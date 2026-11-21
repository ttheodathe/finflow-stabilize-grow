import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const issuer = "https://token.actions.githubusercontent.com";
const audience = "finflowtrack-seo-publisher";
const allowedRepository = "ttheodathe/finflow-stabilize-grow";
const allowedRepositoryId = "1302272765";
const allowedRef = "refs/heads/feat/stage-d-oidc-publisher";
const allowedWorkflowRef = "ttheodathe/finflow-stabilize-grow/.github/workflows/seo-publisher.yml@refs/heads/feat/stage-d-oidc-publisher";
const jwks = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "GitHub Actions OIDC token is required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    if (
      payload.repository !== allowedRepository ||
      String(payload.repository_id || "") !== allowedRepositoryId ||
      payload.ref !== allowedRef ||
      payload.workflow_ref !== allowedWorkflowRef ||
      payload.event_name !== "push"
    ) {
      return new Response(JSON.stringify({ error: "Publisher identity is not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action !== "ping") {
      return new Response(JSON.stringify({ error: "Acceptance endpoint is limited to non-mutating OIDC ping" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      publisherIdentityVerified: true,
      mode: "acceptance-oidc-ping-only",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "GitHub Actions OIDC token verification failed" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
});