import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseSeoStore, createSupabaseSeoStoreFromEnv } from "./supabase-store.mjs";

test("missing Supabase credentials are explicit and do not create a client", () => {
  assert.equal(createSupabaseSeoStoreFromEnv({}), null);
  assert.throws(() => createSupabaseSeoStoreFromEnv({ SUPABASE_URL: "https://project.supabase.co" }), /requires SUPABASE_URL/);
});

test("service-role RPC requests are server-side, scoped and use stable operation arguments", async () => {
  const calls = [];
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co/",
    serviceRoleKey: "server-only-test-key",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json("00000000-0000-4000-8000-000000000001");
    },
  });
  await store.recordRun({
    schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor: "2026-11-19",
    attempt: 1, status: "RUNNING", output: { fixture: true },
  });
  assert.equal(calls[0].url, "https://project.supabase.co/rest/v1/rpc/seo_ops_record_run");
  assert.equal(calls[0].options.headers.apikey, "server-only-test-key");
  assert.equal(calls[0].options.headers.authorization, "Bearer server-only-test-key");
  assert.equal(JSON.parse(calls[0].options.body).p_scheduler_key, "SEARCH_INTELLIGENCE");
});

test("RPC names are allowlisted and HTTP failures are not hidden", async () => {
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co",
    serviceRoleKey: "server-only-test-key",
    fetchImpl: async () => new Response("denied", { status: 403 }),
  });
  await assert.rejects(store.recordRun({
    schedulerKey: "SEARCH_INTELLIGENCE", scheduledFor: "2026-11-19", status: "RUNNING",
  }), /HTTP 403/);
});

test("non-HTTPS remote Supabase endpoints are rejected", () => {
  assert.throws(() => createSupabaseSeoStore({
    url: "http://project.supabase.co", serviceRoleKey: "test",
  }), /HTTPS/);
});


test("activation snapshots are sent as aggregate-only fields", async () => {
  let request;
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co", serviceRoleKey: "server-only-test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return Response.json("00000000-0000-4000-8000-000000000002");
    },
  });
  await store.recordActivationSnapshot({
    snapshotDate: "2026-11-20", registeredUsers: 6, onboardingCompletions: 5,
    activatedUsers: 2, returningActivatedUsers: 1, definitionVersion: "activation-fixture-v1",
    sourceWatermark: "2026-11-20T00:00:00Z", limitations: ["Synthetic fixture"],
  });
  assert.equal(request.url, "https://project.supabase.co/rest/v1/rpc/seo_ops_record_activation_snapshot");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.p_activated_users, 2);
  assert.equal(payload.p_returning_activated_users, 1);
  assert.equal(Object.keys(payload).some((key) => /user_id|email|invoice_id/i.test(key)), false);
});
