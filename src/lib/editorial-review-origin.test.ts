import assert from "node:assert/strict";
import test from "node:test";
import { getEditorialReviewRedirectUrl } from "./editorial-review-origin.ts";

test("allows the FinFlow Track production domains", () => {
  assert.equal(
    getEditorialReviewRedirectUrl("https://finflowtrack.com"),
    "https://finflowtrack.com/editorial/review",
  );
  assert.equal(
    getEditorialReviewRedirectUrl("https://www.finflowtrack.com"),
    "https://www.finflowtrack.com/editorial/review",
  );
});

test("allows FinFlow Track Vercel deployment and branch aliases", () => {
  assert.equal(
    getEditorialReviewRedirectUrl(
      "https://finflow-stabilize-grow-7m1ibzxqx-fin-flow-track.vercel.app",
    ),
    "https://finflow-stabilize-grow-7m1ibzxqx-fin-flow-track.vercel.app/editorial/review",
  );
  assert.equal(
    getEditorialReviewRedirectUrl(
      "https://finflow-stabilize-grow-git-fix-editorial-4bf1a8-fin-flow-track.vercel.app",
    ),
    "https://finflow-stabilize-grow-git-fix-editorial-4bf1a8-fin-flow-track.vercel.app/editorial/review",
  );
});

test("rejects unrelated Vercel projects and lookalike hostnames", () => {
  for (const origin of [
    "https://attacker.vercel.app",
    "https://finflow-stabilize-grow-evil-attacker.vercel.app",
    "https://finflow-stabilize-grow-7m1ibzxqx-fin-flow-track.vercel.app.attacker.test",
    "https://finflowtrack.com.attacker.test",
  ]) {
    assert.throws(() => getEditorialReviewRedirectUrl(origin));
  }
});

test("rejects insecure and local origins", () => {
  for (const origin of [
    "http://finflowtrack.com",
    "http://finflow-stabilize-grow-7m1ibzxqx-fin-flow-track.vercel.app",
    "http://localhost:3000",
  ]) {
    assert.throws(() => getEditorialReviewRedirectUrl(origin));
  }
});
