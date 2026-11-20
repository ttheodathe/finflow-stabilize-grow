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
  assert.equal(calls[0].options.headers.authorization, undefined);
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


test("content operation proposals use a stable, target-bound RPC", async () => {
  let request;
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co", serviceRoleKey: "server-only-test-key",
    fetchImpl: async (url, options) => { request = { url, options }; return Response.json("00000000-0000-4000-8000-000000000003"); },
  });
  await store.recordContentOperation({
    operationKey: "review-123", operationType: "EXISTING_ARTICLE_UPDATE",
    targetPath: "content/blog/cash-flow.md", slug: "cash-flow",
    status: "PROPOSED", payload: { status: "RESEARCH_REQUIRED" },
  });
  assert.equal(request.url, "https://project.supabase.co/rest/v1/rpc/seo_ops_record_content_operation");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.p_operation_key, "review-123");
  assert.equal(payload.p_target_path, "content/blog/cash-flow.md");
  assert.equal(payload.p_status, "PROPOSED");
});

test("Scheduler 2 reads only persisted opportunities for a validated run ID",async()=>{
 let request;
 const store=createSupabaseSeoStore({
  url:"https://project.supabase.co",serviceRoleKey:"server-only-test-key",
  fetchImpl:async(url,options)=>{request={url,options};return Response.json([{id:"00000000-0000-4000-8000-000000000099",opportunity_key:"key-1",target_url:"https://www.finflowtrack.com/blog/a"}]);},
 });
 const rows=await store.listPersistedOpportunities({schedulerRunId:"00000000-0000-4000-8000-000000000001"});
 assert.equal(request.url,"https://project.supabase.co/rest/v1/rpc/seo_ops_get_opportunities");
 assert.equal(JSON.parse(request.options.body).p_scheduler_run_id,"00000000-0000-4000-8000-000000000001");
 assert.equal(request.options.headers.authorization, undefined);
 assert.equal(rows[0].opportunity_key,"key-1");
 await assert.rejects(store.listPersistedOpportunities({schedulerRunId:"not-a-uuid"}),/Persisted Scheduler 1 run ID.*valid UUID/);
});

test("required SEO persistence fails closed outside the explicitly allowed acceptance project",()=>{
 const projectRef="bufbyfwstdqvwnkhyrea";
 assert.throws(()=>createSupabaseSeoStoreFromEnv({
  SEO_PERSISTENCE_REQUIRED:"true",
  SUPABASE_URL:"https://prod-project-ref.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY:"test-key",
 }),/SEO_OPS_ALLOWED_PROJECT_REF/);
 assert.throws(()=>createSupabaseSeoStoreFromEnv({
  SEO_PERSISTENCE_REQUIRED:"true",
  SEO_OPS_ALLOWED_PROJECT_REF:projectRef,
  SUPABASE_URL:"https://prod-project-ref.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY:"test-key",
 }),/does not match the explicitly allowed SEO acceptance project/);
 const store=createSupabaseSeoStoreFromEnv({
  SEO_PERSISTENCE_REQUIRED:"true",
  SEO_OPS_ALLOWED_PROJECT_REF:projectRef,
  SUPABASE_URL:`https://${projectRef}.supabase.co`,
  SUPABASE_SERVICE_ROLE_KEY:"acceptance-test-key",
 });
 assert.ok(store);
});
test("required SEO persistence rejects missing credentials rather than silently disabling persistence",()=>{
 assert.throws(()=>createSupabaseSeoStoreFromEnv({
  SEO_PERSISTENCE_REQUIRED:"true",
  SEO_OPS_ALLOWED_PROJECT_REF:"bufbyfwstdqvwnkhyrea",
 }),/needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
});

test("persistence RPCs reject malformed returned IDs", async () => {
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co", serviceRoleKey: "server-only-test-key",
    fetchImpl: async () => Response.json("not-a-uuid"),
  });
  await assert.rejects(store.recordContentOperation({
    operationKey: "invalid-id", operationType: "NEW_ARTICLE",
    targetPath: "content/blog/example.md", slug: "example",
  }), /valid UUID/);
});

test("independent readback methods use the dedicated restricted RPCs", async () => {
  const calls = [];
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co", serviceRoleKey: "server-only-test-key",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (String(url).includes("seo_ops_get_content_operation")) return Response.json([{id:"00000000-0000-4000-8000-000000000003",payload:{workflowState:"READY_FOR_HUMAN_REVIEW"}}]);
      if (String(url).includes("seo_ops_get_research_records")) return Response.json([{id:"00000000-0000-4000-8000-000000000004",source_url:"https://www.irs.gov/"}]);
      return Response.json([{id:"00000000-0000-4000-8000-000000000005",content_hash:"abc"}]);
    },
  });
  const operationId = "00000000-0000-4000-8000-000000000003";
  const opportunityId = "00000000-0000-4000-8000-000000000001";
  const operation = await store.getContentOperation({operationId});
  const research = await store.listResearchRecords({opportunityId});
  const revisions = await store.listContentRevisions({operationId});
  assert.equal(operation.payload.workflowState,"READY_FOR_HUMAN_REVIEW");
  assert.equal(research.length,1);
  assert.equal(revisions.length,1);
  assert.match(calls[0].url,/seo_ops_get_content_operation/);
  assert.match(calls[1].url,/seo_ops_get_research_records/);
  assert.match(calls[2].url,/seo_ops_get_content_revisions/);
});

test("content revision writes use the immutable revision RPC contract", async () => {
  let request;
  const operationId = "00000000-0000-4000-8000-000000000010";
  const revisionId = "00000000-0000-4000-8000-000000000011";
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co",
    serviceRoleKey: "server-only-test-key",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return Response.json(revisionId);
    },
  });

  const result = await store.recordContentRevision({
    operationId,
    revisionNumber: 2,
    contentHash: "a".repeat(64),
    markdown: "# Proposed draft",
  });

  assert.equal(result, revisionId);
  assert.equal(
    request.url,
    "https://project.supabase.co/rest/v1/rpc/seo_ops_record_content_revision",
  );
  const payload = JSON.parse(request.options.body);
  assert.deepEqual(payload, {
    p_operation_id: operationId,
    p_revision_number: 2,
    p_content_hash: "a".repeat(64),
    p_markdown: "# Proposed draft",
    p_revision_state: "PROPOSED",
  });
  assert.equal(request.options.headers.authorization, undefined);
});

test("content revision writes reject malformed operation IDs before making an RPC", async () => {
  let called = false;
  const store = createSupabaseSeoStore({
    url: "https://project.supabase.co",
    serviceRoleKey: "server-only-test-key",
    fetchImpl: async () => {
      called = true;
      return Response.json("00000000-0000-4000-8000-000000000011");
    },
  });

  await assert.rejects(
    store.recordContentRevision({
      operationId: "not-a-uuid",
      revisionNumber: 1,
      contentHash: "a".repeat(64),
      markdown: "# Draft",
    }),
    /Content revision operation ID.*valid UUID/,
  );
  assert.equal(called, false);
});
