import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — FinFlow Track" }] }),
  component: ReportsPage,
});

type Tab = "pnl" | "balance-sheet";

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
      {tab === "pnl" ? <ProfitAndLoss /> : <BalanceSheet />}
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
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
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
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div>
          <Label>As of</Label>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
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
