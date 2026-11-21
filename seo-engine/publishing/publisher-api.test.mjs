import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const publisherApi = fileURLToPath(new URL("./publisher-api.mjs", import.meta.url));
const acceptedEndpoints = [
  "https://bufbyfwstdqvwnkhyrea.supabase.co/functions/v1/seo-article-publisher-acceptance",
  "https://zjaamxvqjiymgfujrtjm.supabase.co/functions/v1/seo-article-publisher",
];

function runPing(endpoint) {
  const env = { ...process.env, SEO_PUBLISHER_URL: endpoint };
  delete env.ACTIONS_ID_TOKEN_REQUEST_URL;
  delete env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  return spawnSync(process.execPath, [publisherApi, "ping"], {
    env,
    encoding: "utf8",
  });
}

test("publisher client rejects an unapproved Supabase endpoint before requesting an OIDC token", () => {
  const result = runPing("https://attacker.supabase.co/functions/v1/collect");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must exactly match an approved FinFlow Track publisher endpoint/);
  assert.doesNotMatch(result.stderr, /OIDC token request is unavailable/);
});

test("publisher client rejects non-HTTPS and non-canonical endpoint paths", () => {
  for (const endpoint of [
    "http://zjaamxvqjiymgfujrtjm.supabase.co/functions/v1/seo-article-publisher",
    "https://zjaamxvqjiymgfujrtjm.supabase.co/functions/v1/other-function",
  ]) {
    const result = runPing(endpoint);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must exactly match an approved FinFlow Track publisher endpoint/);
  }
});

test("only the exact acceptance and production publisher endpoints pass endpoint validation", () => {
  for (const endpoint of acceptedEndpoints) {
    const result = runPing(endpoint);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /GitHub Actions OIDC token request is unavailable/);
    assert.doesNotMatch(result.stderr, /approved FinFlow Track publisher endpoint/);
  }
});
