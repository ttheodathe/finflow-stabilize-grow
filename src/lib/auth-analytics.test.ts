import assert from "node:assert/strict";
import test from "node:test";
import { isNewEmailSignup, shouldTrackOAuthAuthentication } from "./auth-analytics.ts";

test("only a returned email identity classifies an email signup as a new registration", () => {
  assert.equal(isNewEmailSignup({ identities: [{ provider: "email" }] }), true);
  assert.equal(isNewEmailSignup({ identities: [] }), false);
  assert.equal(isNewEmailSignup({ identities: [{ provider: "google" }] }), false);
  assert.equal(isNewEmailSignup({}), false);
  assert.equal(isNewEmailSignup(null), false);
});

test("OAuth authentication notifications are deduplicated per user and session", () => {
  const seen = new Set<string>();
  assert.equal(shouldTrackOAuthAuthentication("user-a", 1234, seen), true);
  assert.equal(shouldTrackOAuthAuthentication("user-a", 1234, seen), false);
  assert.equal(shouldTrackOAuthAuthentication("user-a", 5678, seen), true);
  assert.equal(shouldTrackOAuthAuthentication(null, 1234, seen), false);
});
