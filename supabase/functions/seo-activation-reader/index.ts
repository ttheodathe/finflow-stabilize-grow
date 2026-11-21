import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const issuer = "https://token.actions.githubusercontent.com";
const jwks = createRemoteJWKSet(
  new URL("https://token.actions.githubusercontent.com/.well-known/jwks"),
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function verifyWorkflowIdentity(request: Request) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("GitHub Actions OIDC token is required.");

  const audience = Deno.env.get("ACTIVATION_READER_OIDC_AUDIENCE") || "finflowtrack-seo-activation";
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  const allowedEvents = ["schedule", "workflow_dispatch"];
  const allowedWorkflowRef =
    "ttheodathe/finflow-stabilize-grow/.github/workflows/" +
    "seo-scheduler-3-performance-learning.yml@refs/heads/main";

  if (
    payload.repository !== "ttheodathe/finflow-stabilize-grow" ||
    String(payload.repository_id || "") !== "1302272765" ||
    payload.ref !== "refs/heads/main" ||
    payload.workflow_ref !== allowedWorkflowRef ||
    !allowedEvents.includes(String(payload.event_name || ""))
  ) {
    throw new Error("GitHub Actions identity is not authorized to read activation metrics.");
  }
  return payload;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    await verifyWorkflowIdentity(request);
  } catch {
    return json({ error: "Activation reader identity rejected" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !["ping", "read"].includes(String(body.action))
  ) {
    return json({ error: "Unsupported activation reader action" }, 400);
  }
  if (body.action === "ping") {
    return json({ ok: true, activationReaderIdentityVerified: true });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "Activation reader is not configured" }, 503);

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("seo_ops_read_activation_aggregate");
  if (error || !Array.isArray(data) || data.length !== 1) {
    return json({ error: "Activation aggregate read failed" }, 503);
  }

  const row = data[0] as Record<string, unknown>;
  const countFields = [
    "registered_users_all_time",
    "onboarding_completions_all_time",
    "activated_users_all_time",
    "returning_activated_users_all_time",
    "new_registrations_30d",
    "new_onboarding_completions_30d",
    "new_activated_users_30d",
    "new_returning_activated_users_30d",
  ];
  const expectedFields = new Set(["source_watermark", ...countFields]);
  const validCount = (value: unknown) => {
    if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0;
    if (typeof value !== "string" || !/^\d+$/.test(value)) return false;
    return Number.isSafeInteger(Number(value));
  };

  if (
    Object.keys(row).length !== expectedFields.size ||
    Object.keys(row).some((key) => !expectedFields.has(key)) ||
    typeof row.source_watermark !== "string" ||
    !Number.isFinite(Date.parse(row.source_watermark)) ||
    countFields.some((key) => !validCount(row[key]))
  ) {
    return json({ error: "Activation aggregate returned an invalid shape" }, 503);
  }
  return json({ aggregate: row });
});
