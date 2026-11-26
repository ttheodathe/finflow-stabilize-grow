import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrencyTotals, localDateKey, sumByCurrency } from "./business-book.ts";

test("sumByCurrency keeps currencies separate", () => {
  const totals = sumByCurrency([
    { currency: "USD", amount: 10 },
    { currency: "usd", amount: "2.5" },
    { currency: "RWF", amount: 1000 },
  ]);

  assert.deepEqual(totals, { USD: 12.5, RWF: 1000 });
});

test("sumByCurrency ignores invalid amounts and defaults a missing currency", () => {
  const totals = sumByCurrency([{ amount: 4 }, { currency: " ", amount: 1 }, { currency: "EUR", amount: "not-a-number" }]);

  assert.deepEqual(totals, { USD: 5 });
});

test("localDateKey uses local calendar date rather than UTC", () => {
  const date = new Date(2026, 10, 26, 23, 45);
  assert.equal(localDateKey(date), "2026-11-26");
});

test("formatCurrencyTotals handles empty and multiple currency totals", () => {
  assert.equal(formatCurrencyTotals({}), "—");

  const formatted = formatCurrencyTotals({ USD: 12, RWF: 5000 });
  assert.match(formatted, /USD|\$/);
  assert.match(formatted, /RWF/);
});
