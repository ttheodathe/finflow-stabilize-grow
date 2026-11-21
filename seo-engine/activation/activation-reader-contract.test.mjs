import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const functionSource = await readFile("supabase/functions/seo-activation-reader/index.ts", "utf8");
const migration = await readFile("supabase/migrations/20261121181000_stage_e_oidc_activation_reader.sql", "utf8");
const workflow = await readFile(".github/workflows/seo-scheduler-3-performance-learning.yml", "utf8");
const collector = await readFile("seo-engine/activation/collect-production-aggregate.mjs", "utf8");

test("activation reader verifies exact GitHub OIDC identity before using service role", () => {
  for (const expected of [
    "https://token.actions.githubusercontent.com",
    "finflowtrack-seo-activation",
    "ttheodathe/finflow-stabilize-grow",
    "1302272765",
    "refs/heads/main",
    "seo-scheduler-3-performance-learning.yml@refs/heads/main",
    '"schedule", "workflow_dispatch"',
  ]) assert.ok(functionSource.includes(expected), `missing OIDC constraint: ${expected}`);
  assert.ok(functionSource.indexOf("await verifyWorkflowIdentity(request)") < functionSource.indexOf("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(functionSource.includes('admin.rpc("seo_ops_read_activation_aggregate")'));
  assert.ok(functionSource.includes('Object.keys(body).length !== 1'));
  assert.ok(functionSource.includes('"Cache-Control": "no-store"'));
});

test("activation aggregate RPC is invoker-only and inaccessible to browser roles", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function[\s\S]*to service_role/i);
  assert.match(migration, /grant select on seo_private\.activation_aggregate to service_role/i);
});

test("Scheduler 3 uses GitHub OIDC and no direct production database password", () => {
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /SEO_ACTIVATION_READER_URL/);
  assert.doesNotMatch(workflow, /SEO_PRODUCTION_READONLY_DATABASE_URL/);
  assert.doesNotMatch(workflow, /postgresql-client/);
  assert.match(collector, /ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.match(collector, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/);
});
