import assert from "node:assert/strict";
import test from "node:test";
import { formatRelativeContact, getDaysSilent } from "./invoice-followups.ts";

const now = new Date("2026-11-28T12:00:00");

test("last contact uses Never and calendar-relative labels", () => {
  assert.equal(formatRelativeContact(null, now), "Never");
  assert.equal(formatRelativeContact("2026-11-28T08:00:00", now), "Today");
  assert.equal(formatRelativeContact("2026-11-25T08:00:00", now), "3 days ago");
});

test("days silent uses the latest contact before the sent date", () => {
  assert.equal(getDaysSilent("overdue", "2026-11-24T08:00:00", "2026-11-01T08:00:00", now), 4);
  assert.equal(getDaysSilent("sent", null, "2026-11-25T08:00:00", now), 3);
});

test("paid and draft invoices never show a silence count", () => {
  assert.equal(getDaysSilent("paid", null, "2026-11-01T08:00:00", now), null);
  assert.equal(getDaysSilent("draft", null, null, now), null);
});

test("unsent invoices without contact history have no inferred silence", () => {
  assert.equal(getDaysSilent("sent", null, null, now), null);
});
