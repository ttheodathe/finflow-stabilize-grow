import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrencyTotals, localDateKey, sumByCurrency } from "./business-book.ts";

test("sumByCurrency keeps currencies separate", () => {
  assert.deepEqual(
    sumByCurrency([
      { currency: "USD", amount: 10 },
      { currency: "usd", amount: "2.5" },
      { currency: "RWF", amount: 1000 },
    ]),
    { USD: 12.5, RWF: 1000 },
  );
});

test("sumByCurrency ignores invalid amounts and defaults a missing currency", () => {
  assert.deepEqual(
    sumByCurrency([{ amount: 4 }, { currency: "EUR", amount: "not-a-number" }]),
    { USD: 4 },
  );
});

test("localDateKey uses local calendar date rather than UTC", () => {
  const date = new Date(2026, 10, 26, 23, 45);
  assert.equal(localDateKey(date), "2026-11-26");
});

test("formatCurrencyTotals handles empty and multiple currency totals", () => {
  assert.equal(formatCurrencyTotals({}), "—");
  assert.match(formatCurrencyTotals({ USD: 12, RWF: 5000 }), /USD|\$/);
  assert.match(formatCurrencyTotals({ USD: 12, RWF: 5000 }), /RWF/);
});
