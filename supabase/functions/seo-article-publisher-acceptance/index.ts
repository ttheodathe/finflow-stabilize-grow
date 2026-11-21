import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const issuer = "https://token.actions.githubusercontent.com";
const audience = "finflowtrack-seo-publisher";
const allowedRepository = "ttheodathe/finflow-stabilize-grow";
const allowedRepositoryId = "1302272765";
const allowedRef = "refs/heads/main";
const allowedWorkflowRef =
  "ttheodathe/finflow-stabilize-grow/.github/workflows/seo-publisher.yml@refs/heads/main";
const jwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "GitHub Actions OIDC token is required" }, 401);

  try {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    if (
      payload.repository !== allowedRepository ||
      String(payload.repository_id || "") !== allowedRepositoryId ||
      payload.ref !== allowedRef ||
      payload.workflow_ref !== allowedWorkflowRef ||
      payload.event_name !== "workflow_dispatch"
    ) {
      return json({ error: "Publisher identity is not authorized" }, 403);
    }

    const body = await request.json().catch(() => null);
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      body.action !== "ping"
    ) {
      return json({ error: "Acceptance endpoint permits only a non-mutating OIDC ping" }, 403);
    }

    return json({
      ok: true,
      publisherIdentityVerified: true,
      mode: "acceptance-oidc-ping-only",
    });
  } catch {
    return json({ error: "GitHub Actions OIDC token verification failed" }, 401);
  }
});
