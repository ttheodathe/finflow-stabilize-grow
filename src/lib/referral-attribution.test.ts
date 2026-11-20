import assert from "node:assert/strict";
import test from "node:test";
import { buildAttributionTouchpoint, mergeAttributionTouchpoints } from "./referral.ts";

test("UTM touchpoints preserve explicit campaign source without inferring organic", () => {
  const touch = buildAttributionTouchpoint({
    href: "https://www.finflowtrack.com/auth?utm_source=linkedin&utm_medium=social&utm_campaign=nov_launch",
    referrer: "",
    now: "2026-11-20T08:00:00.000Z",
  });
  assert.equal(touch.source, "linkedin");
  assert.equal(touch.medium, "social");
  assert.equal(touch.campaign, "nov_launch");
  assert.equal(touch.landingPage, "/auth");
  assert.equal(touch.timestamp, "2026-11-20T08:00:00.000Z");
});

test("external referrers are recorded as referrals, not guessed organic traffic", () => {
  const touch = buildAttributionTouchpoint({
    href: "https://www.finflowtrack.com/",
    referrer: "https://www.google.com/search?q=private+query",
    now: "2026-11-20T08:00:00.000Z",
  });
  assert.equal(touch.source, "www.google.com");
  assert.equal(touch.medium, "referral");
});

test("partner referrals are retained as a referral source without exposing unrelated query data", () => {
  const touch = buildAttributionTouchpoint({
    href: "https://www.finflowtrack.com/?ref=PARTNER42&email=person%40example.com",
    now: "2026-11-20T08:00:00.000Z",
  });
  assert.equal(touch.source, "partner");
  assert.equal(touch.referralCode, "PARTNER42");
});

test("unknown first touch is preserved and¶»§q«^