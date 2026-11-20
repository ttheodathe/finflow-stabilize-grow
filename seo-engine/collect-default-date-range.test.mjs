import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collect, collectPartial } from "./collect.mjs";
import { resolveDateRange } from "./normalize.mjs";

const ok = () => new Response(JSON.stringify({ rows: [] }), { status: 200 });

test("collect defaults to a concrete date range when callers omit it", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-default-range-"));
  try {
    const expected = resolveDateRange();
    const requests = [];
    const result = await collect({
      token: "fixture-token",
      outputDir,
      fetchImpl: async (url) => { requests.push(String(url)); return ok(); },
    });
    assert.deepEqual(result.dateRange, expected);
    assert.ok(result.file.endsWith("seo-data-" + expected.startDate + "-to-" + expected.endDate + ".json"));
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.dateRange, expected);
    assert.equal(requests.filter(url => url.includes("googleapis.com/webmasters")).length, 6);
    assert.equal(requests.filter(url => url.includes("analyticsdata.googleapis.com")).length, 1);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("collectPartial defaults to a concrete date range when callers omit it", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-partial-default-range-"));
  try {
    const expected = resolveDateRange();
    const result = await collectPartial({
      token: "fixture-token",
      outputDir,
      fetchImpl: async () => ok(),
    });
    assert.deepEqual(result.dateRange, expected);
    assert.deepEqual(result.sourceStatus, { gsc: "AVAILABLE", ga4: "AVAILABLE" });
    const snapshot = JSON.parse(await readFile(result.file, "utf8"));
    assert.deepEqual(snapshot.dateRange, expected);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
