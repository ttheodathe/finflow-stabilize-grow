// Run with: node --experimental-strip-types --test src/lib/receivables-summary.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeReceivables, draftReminder, type ReceivableRow } from "./receivables-summary.ts";

const ASOF = "2026-10-21";
const row = (o: Partial<ReceivableRow>): ReceivableRow => ({
  invoice_id: "i",
  invoice_number: "INV-1",
  customer_id: "c1",
  customer_name: "Acme",
  currency: "USD",
  issue_date: "2026-09-01",
  due_date: "2026-10-30",
  status: "sent",
  total: 100,
  amount_paid: 0,
  amount_credited: 0,
  balance: 100,
  days_overdue: 0,
  ...o,
});

test("currencies are never combined", () => {
  const out = summarizeReceivables(
    [row({ balance: 100 }), row({ currency: "RWF", balance: 50000, invoice_id: "j" })],
    ASOF,
  );
  assert.equal(out.length, 2);
  assert.equal(out.find((s) => s.currency === "USD")!.outstanding, 100);
  assert.equal(out.find((s) => s.currency === "RWF")!.outstanding, 50000);
});

test("zero or negative balances (paid / over-credited) are not outstanding", () => {
  const out = summarizeReceivables([row({ balance: 0 }), row({ balance: -5 })], ASOF);
  assert.equal(out.length, 0);
});

test("overdue vs upcoming windows are cumulative and boundary-correct", () => {
  const out = summarizeReceivables(
    [
      row({ invoice_id: "a", balance: 10, due_date: "2026-10-20", days_overdue: 1 }), // overdue
      row({ invoice_id: "b", balance: 20, due_date: "2026-10-21" }), // due today -> not overdue, in 7
      row({ invoice_id: "c", balance: 30, due_date: "2026-10-28" }), // exactly 7 days
      row({ invoice_id: "d", balance: 40, due_date: "2026-11-20" }), // 30 days
      row({ invoice_id: "e", balance: 50, due_date: "2026-12-20" }), // 60 days
      row({ invoice_id: "f", balance: 60, due_date: "2026-12-21" }), // 61 days: outside
      row({ invoice_id: "g", balance: 70, due_date: null }),
    ],
    ASOF,
  )[0];
  assert.equal(out.outstanding, 280);
  assert.equal(out.overdue, 10);
  assert.equal(out.overdueCount, 1);
  assert.equal(out.dueNext7, 50);
  assert.equal(out.dueNext30, 90);
  assert.equal(out.dueNext60, 140);
  assert.equal(out.noDueDate, 70);
});

test("uses the database balance, so partial payments and credit notes are respected", () => {
  const out = summarizeReceivables(
    [row({ total: 1000, amount_paid: 400, amount_credited: 100, balance: 500 })],
    ASOF,
  )[0];
  assert.equal(out.outstanding, 500);
});

test("cent arithmetic has no floating-point drift", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row({ invoice_id: String(i), balance: 0.1 }));
  assert.equal(summarizeReceivables(rows, ASOF)[0].outstanding, 1);
});

test("by-customer grouping and largest balances", () => {
  const out = summarizeReceivables(
    [
      row({ invoice_id: "a", customer_name: "Acme", balance: 100 }),
      row({ invoice_id: "b", customer_name: "Acme", balance: 50 }),
      row({ invoice_id: "c", customer_name: "Beta", balance: 300 }),
      row({ invoice_id: "d", customer_name: null, balance: 10 }),
    ],
    ASOF,
  )[0];
  assert.deepEqual(
    out.byCustomer.map((c) => [c.customer, c.outstanding]),
    [["Beta", 300], ["Acme", 150], ["Unassigned", 10]],
  );
  assert.equal(out.topInvoices[0].invoice_id, "c");
});

test("reminder draft only lists the customer's overdue invoices in that currency", () => {
  const rows = [
    row({ invoice_id: "a", invoice_number: "INV-7", balance: 120, due_date: "2026-10-01", days_overdue: 20 }),
    row({ invoice_id: "b", invoice_number: "INV-8", balance: 80, due_date: "2026-11-30" }), // not overdue
    row({ invoice_id: "c", invoice_number: "INV-9", customer_name: "Beta", balance: 5, days_overdue: 3 }),
  ];
  const text = draftReminder({
    customer: "Acme",
    currency: "USD",
    companyName: "Demo Ltd",
    rows,
    format: (n, c) => `${c} ${n.toFixed(2)}`,
  });
  assert.match(text, /INV-7/);
  assert.doesNotMatch(text, /INV-8|INV-9/);
  assert.match(text, /Total overdue: USD 120.00/);
  assert.equal(draftReminder({ customer: "Zed", currency: "USD", rows, format: () => "" }), "");
});
