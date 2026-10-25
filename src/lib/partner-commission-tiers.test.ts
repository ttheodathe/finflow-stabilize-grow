// Run with: node --experimental-strip-types --test src/lib/partner-commission-tiers.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tierRateForReferralCount,
  resolveTier1Rate,
  isWithinCommissionWindow,
} from "./partner-commission-tiers.ts";

test("tier boundaries", () => {
  assert.equal(tierRateForReferralCount(0), 20);
  assert.equal(tierRateForReferralCount(1), 20);
  assert.equal(tierRateForReferralCount(10), 20);
  assert.equal(tierRateForReferralCount(11), 35);
  assert.equal(tierRateForReferralCount(49), 35);
  assert.equal(tierRateForReferralCount(50), 50);
  assert.equal(tierRateForReferralCount(500), 50);
});

test("standard-rate partners move up; negotiated rates are never changed", () => {
  assert.equal(resolveTier1Rate(20, 12), 35);
  assert.equal(resolveTier1Rate(20, 60), 50);
  assert.equal(resolveTier1Rate(30, 60), 30);
  assert.equal(resolveTier1Rate(10, 60), 10);
});

test("15-month window", () => {
  const first = "2026-01-15T00:00:00Z";
  assert.equal(isWithinCommissionWindow(null), true);
  assert.equal(isWithinCommissionWindow(first, new Date("2027-04-15T00:00:00Z")), true); // exactly 15 months
  assert.equal(isWithinCommissionWindow(first, new Date("2027-04-15T00:00:01Z")), false);
  assert.equal(isWithinCommissionWindow("not-a-date", new Date()), true);
});
