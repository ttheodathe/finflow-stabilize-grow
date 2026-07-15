import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";

export const Route = createFileRoute("/_authenticated/accounting/trial-balance")({
  head: () => ({ meta: [{ title: "Trial balance — Free Accounting" }] }),
  component: TrialBalancePage,
});

type Row = {
  account_id: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
};
const DEBIT_NORMAL = new Set(["asset", "expense"]);

function TrialBalancePage() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(0, 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [accRes, lineRes] = await Promise.all([
        supabase.from("accounts").select("id,code,name,type").order("code"),
        supabase
          .from("journal_lines")
          .select("account_id,debit,credit,journal_entries!inner(entry_date)")
          .gte("journal_entries.entry_date", from)
          .lte("journal_entries.entry_date", to),
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
      const built: Row[] = accounts
        .map((a) => {
          const t = totals.get(a.id) ?? { d: 0, c: 0 };
          const net = t.d - t.c;
          const debitNormal = DEBIT_NORMAL.has(a.type);
          const debit = debitNormal ? Math.max(net, 0) : Math.max(-net, 0) === 0 ? 0 : 0;
          const credit = debitNormal ? Math.max(-net, 0) : Math.max(-net, 0);
          // Correct: put net on natural side
          const d = debitNormal ? Math.max(net, 0) : 0;
          const c = debitNormal ? Math.max(-net, 0) : 0;
          const d2 = !debitNormal ? Math.max(-net, 0) : 0;
          const c2 = !debitNormal ? Math.max(net, 0) : 0;
          return {
            account_id: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            debit: d + d2,
            credit: c + c2,
          };
          void debit;
          void credit;
        })
        .filter((r) => r.debit !== 0 || r.credit !== 0);
      setRows(built);
      setLoading(false);
    })();
  }, [from, to]);

  const totals = useMemo(
    () => ({
      d: rows.reduce((s, r) => s + r.debit, 0),
      c: rows.reduce((s, r) => s + r.credit, 0),
    }),
    [rows],
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">Trial balance</h1>
      <p className="text-muted-foreground mb-6">
        Debit/credit totals per account for the selected period.
      </p>
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
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left w-24">Code</th>
              <th className="px-3 py-2 text-left">Account</th>
              <th className="px-3 py-2 text-left w-32">Type</th>
              <th className="px-3 py-2 text-right w-32">Debit</th>
              <th className="px-3 py-2 text-right w-32">Credit</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No activity in this period.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.account_id} className="border-t">
                <td className="px-3 py-2 font-mono">{r.code}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 capitalize text-muted-foreground">{r.type}</td>
                <td className="px-3 py-2 text-right font-mono">{r.debit ? fmt(r.debit) : ""}</td>
                <td className="px-3 py-2 text-right font-mono">{r.credit ? fmt(r.credit) : ""}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-muted/30">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right font-semibold">
                  Totals
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(totals.d)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(totals.c)}</td>
              </tr>
              <tr>
                <td
                  colSpan={5}
                  className={
                    "px-3 py-2 text-right text-sm " +
                    (Math.round(totals.d * 100) === Math.round(totals.c * 100)
                      ? "text-green-600"
                      : "text-destructive")
                  }
                >
                  {Math.round(totals.d * 100) === Math.round(totals.c * 100)
                    ? "In balance"
                    : `Out of balance by ${fmt(Math.abs(totals.d - totals.c))}`}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
