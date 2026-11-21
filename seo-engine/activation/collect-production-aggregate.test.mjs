import assert from "node:assert/strict";
import test from "node:test";
import { collectProductionActivationAggregate } from "./collect-production-aggregate.mjs";

const endpoint = "https://zjaamxvqjiymgfujrtjm.supabase.co/functions/v1/seo-activation-reader";
const env = {
  ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.actions.githubusercontent.com/token?dummy=1",
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "github-actions-request-token",
  SEO_ACTIVATION_READER_AUDIENCE: "finflowtrack-seo-activation",
};

const row = {
  source_watermark: "2026-11-20T18:00:00.000Z",
  registered_users_all_time: 36,
  onboarding_completions_all_time: 2,
  activated_users_all_time: 1,
  returning_activated_users_all_time: 1,
  new_registrations_30d: 4,
  new_onboarding_completions_30d: 0,
  new_activated_users_30d: 0,
  new_returning_activated_users_30d: 0,
};

test("collector obtains a GitHub OIDC token and returns only the validated aggregate", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith("https://token.actions.githubusercontent.com/")) {
      const parsed = new URL(String(url));
      assert.equal(parsed.searchParams.get("audience"), "finflowtrack-seo-activation");
      return { ok: true, json: async () => ({ value: "short-lived-oidc-token" }) };
    }
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer short-lived-oidc-token");
    assert.deepEqual(JSON.parse(options.body), { action: "read" });
    return { ok: true, json: async () => ({ aggregate: row }) };
  };
  const result = await collectProductionActivationAggregate({ endpoint, env, fetchImpl });
  assert.equal(calls.length, 2);
  assert.deepEqual(result, {
    sourceWatermark: "2026-11-20T18:00:00.000Z",
    registeredUsersAllTime: 36,
    onboardingCompletionsAllTime: 2,
    activatedUsersAllTime: 1,
    returningActivatedUsersAllTime: 1,
    newRegistrations30d: 4,
    newOnboardingCompletions30d: 0,
    newActivatedUsers30d: 0,
    newReturningActivatedUsers30d: 0,
  });
  assert.equal(Object.keys(result).some((key) => /user_id|email|invoice_id|amount/i.test(key)), false);
});

test("collector rejects missing OIDC credentials and unsafe endpoints before making requests", async () => {
  await assert.rejects(
    collectProductionActivationAggregate({ endpoint, env: {}, fetchImpl: async () => { throw new Error("must not call"); } }),
    /OIDC token request is unavailable/,
  );
  for (const unsafe of [
    "http://example-project.supabase.co/functions/v1/seo-activation-reader",
    "https://example-project.supabase.co.evil.test/functions/v1/seo-activation-reader",
    "https://example-project.supabase.co/functions/v1/other",
    "https://user:pass@example-project.supabase.co/functions/v1/seo-activation-reader",
  ]) {
    await assert.rejects(
      collectProductionActivationAggregate({ endpoint: unsafe, env, fetchImpl: async () => { throw new Error("must not call"); } }),
      /approved HTTPS Supabase activation-reader function/,
    );
  }
});

test("collector rejects malformed token and reader responses", async () => {
  await assert.rejects(
    collectProductionActivationAggregate({
      endpoint, env,
      fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    }),
    /OIDC token response was empty/,
  );
  await assert.rejects(
    collectProductionActivationAggregate({
      endpoint, env,
      fetchImpl: async (url) => String(url).startsWith("https://token.actions.githubusercontent.com/")
        ? { ok: true, json: async () => ({ value: "token" }) }
        : { ok: false, status: 401, json: async () => ({ error: "do not leak this" }) },
    }),
    /rejected the request \(401\)/,
  );
});

test("collector rejects unexpected, negative, unsafe, and incomplete aggregate data", async () => {
  for (const invalid of [
    { ...row, new_registrations_30d: -1 },
    { ...row, activated_users_all_time: "1.2" },
    { ...row, registered_users_all_time: Number.MAX_SAFE_INTEGER + 1 },
    { ...row, source_watermark: "not-a-date" },
    { ...row, email: "private@example.test" },
  ]) {
    await assert.rejects(
      collectProductionActivationAggregate({
        endpoint, env,
        fetchImpl: async (url) => String(url).startsWith("https://token.actions.githubusercontent.com/")
          ? { ok: true, json: async () => ({ value: "token" }) }
          : { ok: true, json: async () => ({ aggregate: invalid }) },
      }),
    );
  }
});
