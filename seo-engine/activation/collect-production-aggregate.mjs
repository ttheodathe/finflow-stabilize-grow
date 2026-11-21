function validateEndpoint(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("SEO_ACTIVATION_READER_URL is required.");
  }
  let parsed;
  try { parsed = new URL(value); }
  catch { throw new Error("SEO_ACTIVATION_READER_URL must be a valid HTTPS Supabase Edge Function URL."); }
  if (
    parsed.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
    parsed.pathname !== "/functions/v1/seo-activation-reader" ||
    parsed.search || parsed.hash || parsed.username || parsed.password
  ) {
    throw new Error("SEO_ACTIVATION_READER_URL must target the approved HTTPS Supabase activation-reader function.");
  }
  return parsed.toString();
}

async function getOidcToken({ env, fetchImpl }) {
  const requestUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!requestUrl || !requestToken) {
    throw new Error("GitHub Actions OIDC token request is unavailable.");
  }
  const url = new URL(requestUrl);
  url.searchParams.set("audience", env.SEO_ACTIVATION_READER_AUDIENCE || "finflowtrack-seo-activation");
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${requestToken}` },
  });
  if (!response.ok) throw new Error(`GitHub Actions OIDC token request failed (${response.status}).`);
  const payload = await response.json();
  if (typeof payload.value !== "string" || !payload.value) {
    throw new Error("GitHub Actions OIDC token response was empty.");
  }
  return payload.value;
}

function parseAggregate(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Production activation reader returned an invalid aggregate.");
  }
  const sourceWatermark = new Date(row.source_watermark);
  if (!Number.isFinite(sourceWatermark.getTime())) {
    throw new Error("Production activation reader returned an invalid source watermark.");
  }
  const count = (key, label) => {
    const value = row[key];
    if (!(typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))) {
      throw new Error(`Production activation reader returned an invalid ${label} count.`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new Error(`Production activation reader returned an unsafe ${label} count.`);
    }
    return parsed;
  };
  return {
    sourceWatermark: sourceWatermark.toISOString(),
    registeredUsersAllTime: count("registered_users_all_time", "registered users"),
    onboardingCompletionsAllTime: count("onboarding_completions_all_time", "onboarding completions"),
    activatedUsersAllTime: count("activated_users_all_time", "activated users"),
    returningActivatedUsersAllTime: count("returning_activated_users_all_time", "returning activated users"),
    newRegistrations30d: count("new_registrations_30d", "30-day registrations"),
    newOnboardingCompletions30d: count("new_onboarding_completions_30d", "30-day onboarding completions"),
    newActivatedUsers30d: count("new_activated_users_30d", "30-day activated users"),
    newReturningActivatedUsers30d: count("new_returning_activated_users_30d", "30-day returning activated users"),
  };
}

export async function collectProductionActivationAggregate({
  endpoint = process.env.SEO_ACTIVATION_READER_URL,
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const url = validateEndpoint(endpoint);
  const token = await getOidcToken({ env, fetchImpl });
  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read" }),
    });
  } catch {
    throw new Error("Production activation reader request failed; inspect the Edge Function health and GitHub OIDC configuration.");
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Production activation reader rejected the request (${response.status}).`);
  }
  if (!payload || !payload.aggregate) {
    throw new Error("Production activation reader response did not contain an aggregate.");
  }
  return parseAggregate(payload.aggregate);
}
