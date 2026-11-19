import test from "node:test";
import assert from "node:assert/strict";
import { normalizePageUrl, isoDateDaysAgo, resolveDateRange } from "./normalize.mjs";
import { parseServiceAccount } from "./google-auth.mjs";

test("normalizes casing, query and trailing slash without merging host or scheme variants", () => {
  assert.equal(
    normalizePageUrl("http://www.FinFlowTrack.com/blog/example/?utm_source=test#section"),
    "http://www.finflowtrack.com/blog/example",
  );
  assert.equal(
    normalizePageUrl("https://finflowtrack.com/blog/example/"),
    "https://finflowtrack.com/blog/example",
  );
});

test("preserves root path", () => {
  assert.equal(normalizePageUrl("https://www.finflowtrack.com/"), "https://finflowtrack.com/");
});

test("rejects non-web protocols", () => {
  assert.throws(() => normalizePageUrl("javascript:alert(1)"));
});

test("uses stable UTC date arithmetic", () => {
  assert.equal(isoDateDaysAgo(1, new Date("2026-11-19T12:00:00.000Z")), "2026-11-18");
});

test("defaults to a 28-day inclusive reporting window ending three days ago", () => {
  assert.deepEqual(
    resolveDateRange({ now: new Date("2026-11-19T12:00:00.000Z") }),
    { startDate: "2026-10-20", endDate: "2026-11-16" },
  );
});

test("rejects malformed and reversed date ranges", () => {
  assert.throws(() => resolveDateRange({ startDate: "19-11-2026", endDate: "2026-11-19" }));
  assert.throws(() => resolveDateRange({ startDate: "2026-11-20", endDate: "2026-11-19" }));
});

test("rejects malformed service-account credentials without exposing their contents", () => {
  assert.throws(() => parseServiceAccount("not-json"), /valid JSON/);
  assert.throws(() => parseServiceAccount(JSON.stringify({ type: "service_account" })), /service-account JSON/);
});
