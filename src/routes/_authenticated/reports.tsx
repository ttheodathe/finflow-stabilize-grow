import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

// ---------------------------------------------------------------------------
// Shared CSV export helper — same pattern as items.stock-movements.tsx
// exportCsv(), reused here so every report tab gets export without each
// component re-implementing Blob/anchor-download plumbing.
// ---------------------------------------------------------------------------
function exportRowsAsCsv(
  filenamePrefix: string,
  header: string[],
  rows: (string | number)[][],
) {
  if (rows.length === 0) {
    return false;
  }
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.map(escape).join(",")];
  for (const row of rows) {
    lines.push(row.map(escape).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — FinFlow Track" }] }),
  component: ReportsPage,
});

type Tab = "pnl" | "balance-sheet" | "cash-flow" | "ar-aging" | "ap-aging";

function ReportsPage() {
  const [tab, setTab] = useState<Tab>("pnl");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Reports</h1>
      <p className="text-muted-foreground mb-6">
        Profit & loss and balance sheet, itemized by category and account.
      </p>
      <div className="mb-6 border-b flex gap-6">
        {(
          [
            ["pnl", "Profit & Loss"],
            ["balance-sheet", "Balance Sheet"],
            ["cash-flow", "Cash Flow"],
            ["ar-aging", "AR Aging"],
            ["ap-aging", "AP Aging"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "pnl" && <ProfitAndLoss />}
      {tab === "balance-sheet" && <BalanceSheet />}
      {tab === "cash-flow" && <CashFlow />}
      {tab === "ar-aging" && <ReceivablesAging />}
      {tab === "ap-aging" && <PayablesAging />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profit & Loss — Fix (Jennifer QA — Reports: "P&L should be itemized
// instead of only showing the total"): revenue is broken down by customer
// (paid invoices) and expenses are broken down by category/account, each
// with a subtotal, instead of a single flat total per side.
// ---------------------------------------------------------------------------

function ProfitAndLoss() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const companyId = useActiveCompanyId();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(0, 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [revenueRows, setRevenueRows] = useState<{ label: string; amount: number }[]>([]);
  const [expenseRows, setExpenseRows] = useState<{ label: string; amount: number }[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const [inv, exp] = await Promise.all([
        supabase
          .from("invoices")
          .select("total,status,issue_date,customers(name)").eq("company_id", companyId)
          .gte("issue_date", from)
          .lte("issue_date", to),
        supabase
          .from("expenses")
          .select("amount,category,vendor,expense_date").eq("company_id", companyId)
          .gte("expense_date", from)
          .lte("expense_date", to),
      ]);
      const invoices = (inv.data ?? []) as {
        total: number;
        status: string;
        customers: { name: string } | null;
      }[];
      const expenses = (exp.data ?? []) as { amount: number; category: string | null }[];

      const revByCustomer = new Map<string, number>();
      let out = 0;
      for (const i of invoices) {
        if (i.status === "paid") {
          const key = i.customers?.name ?? "Unassigned";
          revByCustomer.set(key, (revByCustomer.get(key) ?? 0) + Number(i.total));
        } else if (i.status !== "draft") {
          out += Number(i.total);
        }
      }
      const expByCategory = new Map<string, number>();
      for (const e of expenses) {
        const key = e.category || "Uncategorized";
        expByCategory.set(key, (expByCategory.get(key) ?? 0) + Number(e.amount));
      }

      setRevenueRows(
        [...revByCustomer.entries()]
          .map(([label, amount]) => ({ label, amount }))
          .sort((a, b) => b.amount - a.amount),
      );
      setExpenseRows(
        [...expByCategory.entries()]
          .map(([label, amount]) => ({ label, amount }))
          .sort((a, b) => b.amount - a.amount),
      );
      setOutstanding(out);
      setLoading(false);
    })();
  }, [from, to, companyId]);

  const totalRevenue = revenueRows.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + r.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const rows: (string | number)[][] = [];
            rows.push(["Revenue", ""]);
            revenueRows.forEach((r) => rows.push([r.label, r.amount]));
            rows.push(["Total revenue", totalRevenue]);
            rows.push(["Expenses", ""]);
            expenseRows.forEach((r) => rows.push([r.label, r.amount]));
            rows.push(["Total expenses", totalExpenses]);
            rows.push(["Net profit", netProfit]);
            rows.push(["Outstanding invoices", outstanding]);
            if (!exportRowsAsCsv("profit-and-loss", ["Line item", "Amount"], rows)) {
              return;
            }
          }}
          disabled={loading || (revenueRows.length === 0 && expenseRows.length === 0)}
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="bg-muted/40">
              <td className="px-6 py-2 font-semibold" colSpan={2}>
                Revenue
              </td>
            </tr>
            {loading && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && revenueRows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-muted-foreground">
                  No paid invoices in this period.
                </td>
              </tr>
            )}
            {revenueRows.map((r) => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="px-6 py-2 pl-10 text-muted-foreground">{r.label}</td>
                <td className="px-6 py-2 text-right">{fmt(r.amount)}</td>
              </tr>
            ))}
            <tr className="border-b font-semibold">
              <td className="px-6 py-2">Total revenue</td>
              <td className="px-6 py-2 text-right">{fmt(totalRevenue)}</td>
            </tr>

            <tr className="bg-muted/40">
              <td className="px-6 py-2 font-semibold" colSpan={2}>
                Expenses
              </td>
            </tr>
            {!loading && expenseRows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-muted-foreground">
                  No expenses in this period.
                </td>
              </tr>
            )}
            {expenseRows.map((r) => (
              <tr key={r.label} className="border-b last:border-0">
                <td className="px-6 py-2 pl-10 text-muted-foreground">{r.label}</td>
                <td className="px-6 py-2 text-right">{fmt(r.amount)}</td>
              </tr>
            ))}
            <tr className="border-b font-semibold">
              <td className="px-6 py-2">Total expenses</td>
              <td className="px-6 py-2 text-right">{fmt(totalExpenses)}</td>
            </tr>

            <tr className="border-b">
              <td className="px-6 py-3 text-base font-bold">Net profit</td>
              <td className="px-6 py-3 text-right text-base font-bold">{fmt(netProfit)}</td>
            </tr>
            <tr>
              <td className="px-6 py-2 text-muted-foreground">
                Outstanding invoices (not yet paid)
              </td>
              <td className="px-6 py-2 text-right text-muted-foreground">{fmt(outstanding)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Balance Sheet — Fix (Jennifer QA — Reports: "There was no Balance Sheet").
// Built from the general ledger (accounts + journal_lines), the same source
// used by the Trial Balance, as of a chosen date. Net income for the period
// (revenue − expenses posted to the ledger) is folded into Equity so
// Assets = Liabilities + Equity, as on a standard balance sheet.
// ---------------------------------------------------------------------------

type LedgerRow = { code: string; name: string; amount: number };

function BalanceSheet() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const companyId = useActiveCompanyId();
  const [asOf, setAsOf] = useState(() => new Date().toISOString().slice(0, 10));
  const [assets, setAssets] = useState<LedgerRow[]>([]);
  const [liabilities, setLiabilities] = useState<LedgerRow[]>([]);
  const [equity, setEquity] = useState<LedgerRow[]>([]);
  const [netIncome, setNetIncome] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const [accRes, lineRes] = await Promise.all([
        supabase.from("accounts").select("id,code,name,type").eq("company_id", companyId).order("code"),
        supabase
          .from("journal_lines")
          .select("account_id,debit,credit,journal_entries!inner(entry_date)").eq("company_id", companyId)
          .lte("journal_entries.entry_date", asOf),
      ]);
      const accounts = (accRes.data ?? []) as {
        id: string;
        code: string;
        name: string;
        type: string;
      }[];
      const lines = (lineRes.data ?? []) as unknown as {
        account_id: string;
        debit: number;
        credit: number;
      }[];
      const totals = new Map<string, { d: number; c: number }>();
      lines.forEach((l) => {
        const cur = totals.get(l.account_id) ?? { d: 0, c: 0 };
        cur.d += Number(l.debit);
        cur.c += Number(l.credit);
        totals.set(l.account_id, cur);
      });

      const a: LedgerRow[] = [];
      const li: LedgerRow[] = [];
      const eq: LedgerRow[] = [];
      let revenueTotal = 0;
      let expenseTotal = 0;

      for (const acct of accounts) {
        const t = totals.get(acct.id) ?? { d: 0, c: 0 };
        const net = t.d - t.c;
        if (net === 0) continue;
        if (acct.type === "asset") {
          a.push({ code: acct.code, name: acct.name, amount: net });
        } else if (acct.type === "liability") {
          li.push({ code: acct.code, name: acct.name, amount: -net });
        } else if (acct.type === "equity") {
          eq.push({ code: acct.code, name: acct.name, amount: -net });
        } else if (acct.type === "revenue") {
          revenueTotal += -net;
        } else if (acct.type === "expense") {
          expenseTotal += net;
        }
      }

      setAssets(a.sort((x, y) => x.code.localeCompare(y.code)));
      setLiabilities(li.sort((x, y) => x.code.localeCompare(y.code)));
      setEquity(eq.sort((x, y) => x.code.localeCompare(y.code)));
      setNetIncome(revenueTotal - expenseTotal);
      setLoading(false);
    })();
  }, [asOf, companyId]);

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const totalEquity = equity.reduce((s, r) => s + r.amount, 0) + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const inBalance =
    Math.round(totalAssets * 100) === Math.round(totalLiabilitiesAndEquity * 100);

  function Section({ title, rows, total }: { title: string; rows: LedgerRow[]; total: number }) {
    return (
      <>
        <tr className="bg-muted/40">
          <td className="px-6 py-2 font-semibold" colSpan={2}>
            {title}
          </td>
        </tr>
        {rows.length === 0 && (
          <tr>
            <td colSpan={2} className="px-6 py-3 text-muted-foreground">
              No activity as of this date.
            </td>
          </tr>
        )}
        {rows.map((r) => (
          <tr key={r.code} className="border-b last:border-0">
            <td className="px-6 py-2 pl-10 text-muted-foreground">
              <span className="font-mono text-xs mr-2">{r.code}</span>
              {r.name}
            </td>
            <td className="px-6 py-2 text-right">{fmt(r.amount)}</td>
          </tr>
        ))}
        <tr className="border-b font-semibold">
          <td className="px-6 py-2">Total {title.toLowerCase()}</td>
          <td className="px-6 py-2 text-right">{fmt(total)}</td>
        </tr>
      </>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <Label>As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const rows: (string | number)[][] = [];
            rows.push(["Assets", ""]);
            assets.forEach((r) => rows.push([`${r.code} ${r.name}`, r.amount]));
            rows.push(["Total assets", totalAssets]);
            rows.push(["Liabilities", ""]);
            liabilities.forEach((r) => rows.push([`${r.code} ${r.name}`, r.amount]));
            rows.push(["Total liabilities", totalLiabilities]);
            rows.push(["Equity", ""]);
            equity.forEach((r) => rows.push([`${r.code} ${r.name}`, r.amount]));
            rows.push(["Net income (current period)", netIncome]);
            rows.push(["Total equity", totalEquity]);
            rows.push(["Total liabilities & equity", totalLiabilitiesAndEquity]);
            exportRowsAsCsv("balance-sheet", ["Line item", "Amount"], rows);
          }}
          disabled={loading || assets.length === 0}
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <Section title="Assets" rows={assets} total={totalAssets} />
              <Section title="Liabilities" rows={liabilities} total={totalLiabilities} />
              <tr className="bg-muted/40">
                <td className="px-6 py-2 font-semibold" colSpan={2}>
                  Equity
                </td>
              </tr>
              {equity.length === 0 && netIncome === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-3 text-muted-foreground">
                    No activity as of this date.
                  </td>
                </tr>
              )}
              {equity.map((r) => (
                <tr key={r.code} className="border-b last:border-0">
                  <td className="px-6 py-2 pl-10 text-muted-foreground">
                    <span className="font-mono text-xs mr-2">{r.code}</span>
                    {r.name}
                  </td>
                  <td className="px-6 py-2 text-right">{fmt(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-b">
                <td className="px-6 py-2 pl-10 text-muted-foreground">
                  Net income (current period, from ledger)
                </td>
                <td className="px-6 py-2 text-right">{fmt(netIncome)}</td>
              </tr>
              <tr className="border-b font-semibold">
                <td className="px-6 py-2">Total equity</td>
                <td className="px-6 py-2 text-right">{fmt(totalEquity)}</td>
              </tr>

              <tr className="border-b">
                <td className="px-6 py-3 text-base font-bold">Total liabilities & equity</td>
                <td className="px-6 py-3 text-right text-base font-bold">
                  {fmt(totalLiabilitiesAndEquity)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  className={
                    "px-6 py-2 text-right text-sm " +
                    (inBalance ? "text-green-600" : "text-destructive")
                  }
                >
                  {inBalance
                    ? "Assets = Liabilities + Equity — in balance"
                    : `Out of balance by ${fmt(Math.abs(totalAssets - totalLiabilitiesAndEquity))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-3">
        Balance Sheet is built from ledger-posted transactions (Bills and Journal Entries). Invoices
        and Expenses recorded outside the ledger are reflected in the Profit & Loss report but do
        not post to the general ledger automatically.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Flow Statement (indirect method) — built from the same ledger source
// (accounts + journal_lines) as the Balance Sheet, so the ending cash
// balance here reconciles with the "Cash"/"Bank account" line on the
// Balance Sheet as of the same date. Previously promised on the marketing
// features page ("Cash Flow reports") but never implemented — this closes
// that gap.
//
// Cash & cash equivalents are identified by asset accounts whose code
// starts with "10" (matches the seeded default chart of accounts: 1000
// Cash, 1010 Bank account) or whose name contains "cash" or "bank", since
// there is no dedicated account subtype column to flag this structurally.
// ---------------------------------------------------------------------------

function isCashAccount(code: string, name: string): boolean {
  if (code.startsWith("10")) return true;
  const n = name.toLowerCase();
  return n.includes("cash") || n.includes("bank");
}

function CashFlow() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const companyId = useActiveCompanyId();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(0, 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [netIncome, setNetIncome] = useState(0);
  const [workingCapitalRows, setWorkingCapitalRows] = useState<LedgerRow[]>([]);
  const [beginningCash, setBeginningCash] = useState(0);
  const [endingCash, setEndingCash] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const dayBeforeFrom = new Date(from);
      dayBeforeFrom.setDate(dayBeforeFrom.getDate() - 1);
      const beginningAsOf = dayBeforeFrom.toISOString().slice(0, 10);

      const [accRes, linesToRes, linesBeforeRes, linesUpToFromRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id,code,name,type")
          .eq("company_id", companyId)
          .order("code"),
        supabase
          .from("journal_lines")
          .select("account_id,debit,credit,journal_entries!inner(entry_date)")
          .eq("company_id", companyId)
          .lte("journal_entries.entry_date", to),
        supabase
          .from("journal_lines")
          .select("account_id,debit,credit,journal_entries!inner(entry_date)")
          .eq("company_id", companyId)
          .lte("journal_entries.entry_date", beginningAsOf),
        supabase
          .from("journal_lines")
          .select("account_id,debit,credit,journal_entries!inner(entry_date)")
          .eq("company_id", companyId)
          .gte("journal_entries.entry_date", from)
          .lte("journal_entries.entry_date", to),
      ]);

      const accounts = (accRes.data ?? []) as {
        id: string;
        code: string;
        name: string;
        type: string;
      }[];

      function sumBy(rows: any[] | null) {
        const totals = new Map<string, { d: number; c: number }>();
        (rows ?? []).forEach((l: any) => {
          const cur = totals.get(l.account_id) ?? { d: 0, c: 0 };
          cur.d += Number(l.debit);
          cur.c += Number(l.credit);
          totals.set(l.account_id, cur);
        });
        return totals;
      }

      const totalsAsOfTo = sumBy(linesToRes.data as any[]);
      const totalsAsOfBeginning = sumBy(linesBeforeRes.data as any[]);
      const totalsInPeriod = sumBy(linesUpToFromRes.data as any[]);

      // Cash balances at start/end of period (net debit balance on cash accounts).
      let cashBegin = 0;
      let cashEnd = 0;
      for (const acct of accounts) {
        if (acct.type !== "asset" || !isCashAccount(acct.code, acct.name)) continue;
        const beginT = totalsAsOfBeginning.get(acct.id) ?? { d: 0, c: 0 };
        const endT = totalsAsOfTo.get(acct.id) ?? { d: 0, c: 0 };
        cashBegin += beginT.d - beginT.c;
        cashEnd += endT.d - endT.c;
      }

      // Net income for the period, from revenue/expense accounts posted in the period.
      let revenueTotal = 0;
      let expenseTotal = 0;
      const wc: LedgerRow[] = [];
      for (const acct of accounts) {
        const t = totalsInPeriod.get(acct.id) ?? { d: 0, c: 0 };
        const net = t.d - t.c;
        if (acct.type === "revenue") {
          revenueTotal += -net;
        } else if (acct.type === "expense") {
          expenseTotal += net;
        } else if (
          (acct.type === "asset" && !isCashAccount(acct.code, acct.name)) ||
          acct.type === "liability"
        ) {
          // Working-capital adjustment: an increase in a non-cash asset
          // consumes cash (negative adjustment); an increase in a
          // liability frees cash (positive adjustment).
          if (net === 0) continue;
          const adjustment = acct.type === "asset" ? -net : net;
          wc.push({ code: acct.code, name: acct.name, amount: adjustment });
        }
      }

      setNetIncome(revenueTotal - expenseTotal);
      setWorkingCapitalRows(wc.sort((a, b) => a.code.localeCompare(b.code)));
      setBeginningCash(cashBegin);
      setEndingCash(cashEnd);
      setLoading(false);
    })();
  }, [from, to, companyId]);

  const workingCapitalTotal = workingCapitalRows.reduce((s, r) => s + r.amount, 0);
  const operatingCashFlow = netIncome + workingCapitalTotal;
  const netChangeInCash = endingCash - beginningCash;
  // Reconciliation check: operating cash flow (the only category this
  // ledger-derived method currently computes) should equal the actual
  // change in cash accounts. A gap here means cash moved for a reason
  // this method doesn't yet categorize (e.g. an investing or financing
  // transaction posted directly against a cash account) — surfaced below
  // as "Other financing & investing activity" rather than hidden.
  const otherActivity = netChangeInCash - operatingCashFlow;

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const rows: (string | number)[][] = [];
            rows.push(["Net income", netIncome]);
            rows.push(["Working capital adjustments", ""]);
            workingCapitalRows.forEach((r) => rows.push([`${r.code} ${r.name}`, r.amount]));
            rows.push(["Net cash from operating activities", operatingCashFlow]);
            rows.push(["Other financing & investing activity", otherActivity]);
            rows.push(["Net change in cash", netChangeInCash]);
            rows.push(["Beginning cash", beginningCash]);
            rows.push(["Ending cash", endingCash]);
            exportRowsAsCsv("cash-flow", ["Line item", "Amount"], rows);
          }}
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-muted/40">
                <td className="px-6 py-2 font-semibold" colSpan={2}>
                  Operating activities
                </td>
              </tr>
              <tr className="border-b last:border-0">
                <td className="px-6 py-2 pl-10 text-muted-foreground">Net income</td>
                <td className="px-6 py-2 text-right">{fmt(netIncome)}</td>
              </tr>
              {workingCapitalRows.length > 0 && (
                <tr>
                  <td className="px-6 py-2 pl-10 text-muted-foreground italic" colSpan={2}>
                    Adjustments for changes in working capital
                  </td>
                </tr>
              )}
              {workingCapitalRows.map((r) => (
                <tr key={r.code} className="border-b last:border-0">
                  <td className="px-6 py-2 pl-14 text-muted-foreground">
                    <span className="font-mono text-xs mr-2">{r.code}</span>
                    {r.name}
                  </td>
                  <td className="px-6 py-2 text-right">{fmt(r.amount)}</td>
                </tr>
              ))}
              <tr className="border-b font-semibold">
                <td className="px-6 py-2">Net cash from operating activities</td>
                <td className="px-6 py-2 text-right">{fmt(operatingCashFlow)}</td>
              </tr>

              {Math.round(otherActivity * 100) !== 0 && (
                <tr className="border-b">
                  <td className="px-6 py-2 text-muted-foreground">
                    Other financing & investing activity
                  </td>
                  <td className="px-6 py-2 text-right text-muted-foreground">
                    {fmt(otherActivity)}
                  </td>
                </tr>
              )}

              <tr className="border-b">
                <td className="px-6 py-3 text-base font-bold">Net change in cash</td>
                <td className="px-6 py-3 text-right text-base font-bold">
                  {fmt(netChangeInCash)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-6 py-2 text-muted-foreground">Beginning cash</td>
                <td className="px-6 py-2 text-right text-muted-foreground">
                  {fmt(beginningCash)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-2 font-semibold">Ending cash</td>
                <td className="px-6 py-2 text-right font-semibold">{fmt(endingCash)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-3">
        Built using the indirect method from ledger-posted transactions (the same source as the
        Balance Sheet), so ending cash reconciles with cash & bank accounts as of the same date.
        "Other financing & investing activity" captures cash movements this method doesn't yet
        categorize into operating activities (e.g. loan draws or asset purchases posted directly
        to a cash account).
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts Receivable Aging — open (non-draft, non-paid) invoices bucketed
// by days past due as of today.
// ---------------------------------------------------------------------------

type AgingRow = { name: string; current: number; d1_30: number; d31_60: number; d61_90: number; d90_plus: number; total: number };

function bucketByDaysPastDue(dueDate: string, amount: number, row: AgingRow) {
  const due = new Date(dueDate);
  const today = new Date();
  const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) row.current += amount;
  else if (days <= 30) row.d1_30 += amount;
  else if (days <= 60) row.d31_60 += amount;
  else if (days <= 90) row.d61_90 += amount;
  else row.d90_plus += amount;
  row.total += amount;
}

function AgingTable({
  rows,
  loading,
  emptyLabel,
  nameLabel,
}: {
  rows: AgingRow[];
  loading: boolean;
  emptyLabel: string;
  nameLabel: string;
}) {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const totals = rows.reduce(
    (acc, r) => ({
      current: acc.current + r.current,
      d1_30: acc.d1_30 + r.d1_30,
      d31_60: acc.d31_60 + r.d31_60,
      d61_90: acc.d61_90 + r.d61_90,
      d90_plus: acc.d90_plus + r.d90_plus,
      total: acc.total + r.total,
    }),
    { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 },
  );

  return (
    <div className="bg-card border rounded-xl overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-6 py-2 text-left font-semibold">{nameLabel}</th>
            <th className="px-4 py-2 text-right font-semibold">Current</th>
            <th className="px-4 py-2 text-right font-semibold">1–30</th>
            <th className="px-4 py-2 text-right font-semibold">31–60</th>
            <th className="px-4 py-2 text-right font-semibold">61–90</th>
            <th className="px-4 py-2 text-right font-semibold">90+</th>
            <th className="px-6 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-muted-foreground">
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.name} className="border-b last:border-0">
              <td className="px-6 py-2">{r.name}</td>
              <td className="px-4 py-2 text-right">{fmt(r.current)}</td>
              <td className="px-4 py-2 text-right">{fmt(r.d1_30)}</td>
              <td className="px-4 py-2 text-right">{fmt(r.d31_60)}</td>
              <td className="px-4 py-2 text-right">{fmt(r.d61_90)}</td>
              <td className="px-4 py-2 text-right">{fmt(r.d90_plus)}</td>
              <td className="px-6 py-2 text-right font-medium">{fmt(r.total)}</td>
            </tr>
          ))}
          {rows.length > 0 && (
            <tr className="font-semibold border-t">
              <td className="px-6 py-2">Total</td>
              <td className="px-4 py-2 text-right">{fmt(totals.current)}</td>
              <td className="px-4 py-2 text-right">{fmt(totals.d1_30)}</td>
              <td className="px-4 py-2 text-right">{fmt(totals.d31_60)}</td>
              <td className="px-4 py-2 text-right">{fmt(totals.d61_90)}</td>
              <td className="px-4 py-2 text-right">{fmt(totals.d90_plus)}</td>
              <td className="px-6 py-2 text-right">{fmt(totals.total)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReceivablesAging() {
  const companyId = useActiveCompanyId();
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoices")
        .select("total,status,due_date,customers(name)")
        .eq("company_id", companyId)
        .not("status", "in", "(draft,paid)");
      if (error) {
        setLoading(false);
        return;
      }
      const byCustomer = new Map<string, AgingRow>();
      for (const inv of (data ?? []) as {
        total: number;
        due_date: string | null;
        customers: { name: string } | null;
      }[]) {
        if (!inv.due_date) continue;
        const name = inv.customers?.name ?? "Unassigned";
        const row =
          byCustomer.get(name) ??
          ({ name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 } as AgingRow);
        bucketByDaysPastDue(inv.due_date, Number(inv.total), row);
        byCustomer.set(name, row);
      }
      setRows([...byCustomer.values()].sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [companyId]);

  return (
    <div>
      <p className="text-muted-foreground mb-4">
        Unpaid invoices as of today, grouped by customer and days past due.
      </p>
      <AgingTable
        rows={rows}
        loading={loading}
        emptyLabel="No outstanding invoices."
        nameLabel="Customer"
      />
    </div>
  );
}

function PayablesAging() {
  const companyId = useActiveCompanyId();
  const [rows, setRows] = useState<AgingRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bills")
        .select("total,status,due_date,vendors(name)")
        .eq("company_id", companyId)
        .neq("status", "paid");
      if (error) {
        setLoading(false);
        return;
      }
      const byVendor = new Map<string, AgingRow>();
      for (const bill of (data ?? []) as {
        total: number;
        due_date: string | null;
        vendors: { name: string } | null;
      }[]) {
        if (!bill.due_date) continue;
        const name = bill.vendors?.name ?? "Unassigned";
        const row =
          byVendor.get(name) ??
          ({ name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 } as AgingRow);
        bucketByDaysPastDue(bill.due_date, Number(bill.total), row);
        byVendor.set(name, row);
      }
      setRows([...byVendor.values()].sort((a, b) => b.total - a.total));
      setLoading(false);
    })();
  }, [companyId]);

  return (
    <div>
      <p className="text-muted-foreground mb-4">
        Unpaid bills as of today, grouped by vendor and days past due.
      </p>
      <AgingTable
        rows={rows}
        loading={loading}
        emptyLabel="No outstanding bills."
        nameLabel="Vendor"
      />
    </div>
  );
}
