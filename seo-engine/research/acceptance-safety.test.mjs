import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runner = await readFile(new URL("./acceptance-run.mjs", import.meta.url), "utf8");
const workflow = await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");

test("acceptance database writes require explicit authorization", () => {
  assert.match(runner, /SEO_ACCEPTANCE_WRITE_AUTHORIZED/);
  assert.match(workflow, /acceptance-write-authorized/);
  assert.match(workflow, /SEO_ACCEPTANCE_WRITE_AUTHORIZED:\s*"true"/);
});

test("blocked acceptance is non-zero and its evidence upload is unconditional", () => {
  assert.match(runner, /process\.exitCode\s*=\s*2/);
  assert.match(runner, /process\.exitCode\s*=\s*2;\s*\}\s*else\s*\{/);
  assert.doesNotMatch(runner, /process\.exit\(0\)/);
  assert.match(workflow, /name: Upload genuine acceptance evidence\n\s+if: always\(\)/);
});
