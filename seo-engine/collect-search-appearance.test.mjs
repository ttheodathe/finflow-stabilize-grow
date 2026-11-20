import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collect } from "./collect.mjs";

test("GSC search appearance is queried without incompatible dimensions", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "seo-search-appearance-"));
  const dimensions = [];
  const fetchImpl = async (url, options = {}) => {
    if (String(url).includes("googleapis.com/webmasters")) {
      dimensions.push(JSON.parse(options.body).dimensions);
    }
    return new Response(JSON.stringify({ rows: [] }), { status: 200 });
  };

  try {
    await collect({
      dateRange: { startDate: "2026-10-01", endDate: "2026-10-02" },
      token: "fixture-token",
      outputDir,
      fetchImpl,
    });

    assert.deepEqual(dimensions, [
      ["date", "page"],
      ["date", "query"],
      ["date", "page", "query"],
      ["date", "page", "country"],
      ["date", "page", "device"],
      ["searchAppearance"],
    ]);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
