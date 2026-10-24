// Deterministic receivables summary. All money math is done in integer cents
// and grouped PER CURRENCY: currencies are never added together.
// Input rows come from the database function public.invoice_receivable_balances.

export type ReceivableRow = {
  invoice_id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  currency: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  total: number | string;
  amount_paid: number | string;
  amount_credited: number | string;
  balance: number | string;
  days_overdue: number;
};

export type CustomerBalance = {
  customer: string;
  outstanding: number;
  overdue: number;
  invoiceCount: number;
};

export type CurrencySummary = {
  currency: string;
  invoiceCount: number;
  outstanding: number;
  overdue: number;
  overdueCount: number;
  /** Not yet overdue and due within N days of today (cumulative). */
  dueNext7: number;
  dueNext30: number;
  dueNext60: number;
  /** Open invoices that have no due date (counted in outstanding only). */
  noDueDate: number;
  byCustomer: CustomerBalance[];
  topInvoices: ReceivableRow[];
  statusCounts: Record<string, number>;
};

const cents = (n: number | string) => Math.round(Number(n) * 100);
const fromCents = (c: number) => c / 100;
const UNASSIGNED = "Unassigned";

function dayNumber(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export function summarizeReceivables(rows: ReceivableRow[], asOf: string): CurrencySummary[] {
  const today = dayNumber(asOf);
  type Acc = {
    s: CurrencySummary;
    o: number;
    ov: number;
    d7: number;
    d30: number;
    d60: number;
    nd: number;
    cust: Map<string, { o: number; ov: number; n: number }>;
  };
  const acc = new Map<string, Acc>();

  for (const r of rows) {
    const bal = cents(r.balance);
    if (!(bal > 0)) continue; // paid, zero or negative balances are never outstanding
    let a = acc.get(r.currency);
    if (!a) {
      a = {
        s: {
          currency: r.currency,
          invoiceCount: 0,
          outstanding: 0,
          overdue: 0,
          overdueCount: 0,
          dueNext7: 0,
          dueNext30: 0,
          dueNext60: 0,
          noDueDate: 0,
          byCustomer: [],
          topInvoices: [],
          statusCounts: {},
        },
        o: 0,
        ov: 0,
        d7: 0,
        d30: 0,
        d60: 0,
        nd: 0,
        cust: new Map(),
      };
      acc.set(r.currency, a);
    }
    a.s.invoiceCount += 1;
    a.o += bal;
    a.s.statusCounts[r.status] = (a.s.statusCounts[r.status] ?? 0) + 1;
    a.s.topInvoices.push(r);

    const name = r.customer_name?.trim() || UNASSIGNED;
    const c = a.cust.get(name) ?? { o: 0, ov: 0, n: 0 };
    c.o += bal;
    c.n += 1;

    if (!r.due_date) {
      a.nd += bal;
    } else {
      const until = dayNumber(r.due_date) - today;
      if (until < 0) {
        a.ov += bal;
        a.s.overdueCount += 1;
        c.ov += bal;
      } else {
        if (until <= 7) a.d7 += bal;
        if (until <= 30) a.d30 += bal;
        if (until <= 60) a.d60 += bal;
      }
    }
    a.cust.set(name, c);
  }

  return [...acc.values()]
    .map((a) => ({
      ...a.s,
      outstanding: fromCents(a.o),
      overdue: fromCents(a.ov),
      dueNext7: fromCents(a.d7),
      dueNext30: fromCents(a.d30),
      dueNext60: fromCents(a.d60),
      noDueDate: fromCents(a.nd),
      byCustomer: [...a.cust.entries()]
        .map(([customer, v]) => ({
          customer,
          outstanding: fromCents(v.o),
          overdue: fromCents(v.ov),
          invoiceCount: v.n,
        }))
        .sort((x, y) => y.outstanding - x.outstanding || x.customer.localeCompare(y.customer)),
      topInvoices: [...a.s.topInvoices]
        .sort((x, y) => cents(y.balance) - cents(x.balance))
        .slice(0, 5),
    }))
    .sort((x, y) => y.outstanding - x.outstanding);
}

/**
 * Plain-text payment reminder DRAFT. Built from the customer's real overdue
 * invoices only; nothing is sent automatically. The user reviews and edits it.
 */
export function draftReminder(opts: {
  customer: string;
  currency: string;
  companyName?: string;
  rows: ReceivableRow[];
  format: (amount: number, currency: string) => string;
}): string {
  const mine = opts.rows
    .filter((r) => (r.customer_name?.trim() || UNASSIGNED) === opts.customer)
    .filter((r) => r.currency === opts.currency && r.days_overdue > 0 && cents(r.balance) > 0)
    .sort((a, b) => b.days_overdue - a.days_overdue);
  if (mine.length === 0) return "";
  const total = mine.reduce((s, r) => s + cents(r.balance), 0);
  const lines = mine.map(
    (r) =>
      `- Invoice ${r.invoice_number}: ${opts.format(fromCents(cents(r.balance)), r.currency)} ` +
      `(due ${r.due_date}, ${r.days_overdue} day${r.days_overdue === 1 ? "" : "s"} overdue)`,
  );
  return [
    `Hello ${opts.customer === UNASSIGNED ? "" : opts.customer},`.replace(/ ,$/, ","),
    "",
    "This is a friendly reminder that the following invoice(s) are now past their due date:",
    "",
    ...lines,
    "",
    `Total overdue: ${opts.format(fromCents(total), opts.currency)}`,
    "",
    "If you have already made this payment, please ignore this message and accept our thanks. " +
      "Otherwise, please arrange payment at your earliest convenience, or reply to let us know " +
      "when we can expect it.",
    "",
    "Thank you,",
    opts.companyName ?? "",
  ]
    .join("\n")
    .trimEnd();
}
