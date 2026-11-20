import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectProductionActivationAggregate } from "./collect-production-aggregate.mjs";

const connectionString = "postgresql://seo_readonly:secret-password@db.example.supabase.co:5432/postgres";

test("production activation collector accepts only a dedicated PostgreSQL login and returns aggregate counts", async () => {
  let invocation;
  const result = await collectProductionActivationAggregate({
    connectionString,
    execFileImpl: async (command, args, options) => {
      invocation = { command, args, options };
      return { stdout: "2026-11-20 18:00:00+00|36|2|1|1|4|0|0|0\n" };
    },
  });
  assert.equal(invocation.command, "psql");
  assert.ok(invocation.args.includes("--set=ON_ERROR_STOP=1"));
  assert.ok(invocation.args.includes("--no-psqlrc"));
  assert.equal(invocation.options.env.PGSSLMODE, "require");
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
  assert.equal(Object.keys(result).some((key) => /user_id|email|invoice_id/i.test(key)), false);
});

test("production activation collector rejects missing, malformed, and administrator connection strings", async () => {
  await assert.rejects(collectProductionActivationAggregate({}), /is required/);
  await assert.rejects(collectProductionActivationAggregate({ connectionString: "https://example.com" }), /valid PostgreSQL connection URI/);
  await assert.rejects(collectProductionActivationAggregate({
    connectionString: "postgresql://postgres:admin-password@db.example.supabase.co:5432/postgres",
  }), /dedicated username/);
});

test("production activation collector fails closed when the SQL file is not the approved read-only query", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "seo-activation-query-"));
  try {
    const queryFile = path.join(directory, "unsafe.sql");
    await writeFile(queryFile, "-- READ-ONLY PRODUCTION AGGREGATE QUERY.\nselect 1; update public.profiles set created_at = now();\n");
    let invoked = false;
    await assert.rejects(collectProductionActivationAggregate({
      connectionString, queryFile,
      execFileImpl: async () => { invoked = true; return { stdout: "" }; },
    }), /did not pass the read-only query guard/);
    assert.equal(invoked, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("production activation collector never leaks driver errors or credentials", async () => {
  const secret = "postgresql://seo_readonly:very-secret@db.example.supabase.co:5432/postgres";
  await assert.rejects(collectProductionActivationAggregate({
    connectionString: secret,
    execFileImpl: async () => { throw new Error(`connection failed for ${secret}`); },
  }), (error) => {
    assert.match(error.message, /read-only activation query failed/);
    assert.equal(error.message.includes("very-secret"), false);
    assert.equal(error.message.includes("db.example"), false);
    return true;
  });
});
