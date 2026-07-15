import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { formatCurrency } from "@/lib/currencies";

export const Route = createFileRoute("/_authenticated/accounting/ledger")({
  head: () => ({ meta: [{ title: "General ledger — Free Accounting" }] }),
  component: LedgerPage,
});

type Account = { id: string; code: string; name: string; type: string };
type Line = {
  id: string;
  debit: number;
  credit: number;
  description: string | null;
  journal_entries: {
    entry_date: string;
    reference: string | null;
    memo: string | null;
    source_type: string | null;
  } | null;
};

const DEBIT_NORMAL = new Set(["asset", "expense"]);

function LedgerPage() {
  const currency = useDefaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("accounts").select("id,code,name,type").order("code");
      setAccounts((data ?? []) as Account[]);
      if (data && data.length && !accountId) setAccountId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!accountId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("journal_lines")
        .select(
          "id,debit,credit,description,journal_entries!inner(entry_date,reference,memo,source_type)",
        )
        .eq("account_id", accountId)
        .gte("journal_entries.entry_date", from)
        .lte("journal_entries.entry_date", to)
        .order("entry_date", { referencedTable: "journal_entries", ascending: true });
      if (!error) setLines((data ?? []) as unknown as Line[]);
      setLoading(false);
    })();
  }, [accountId, from, to]);

  const account = accounts.find((a) => a.id === accountId);
  const debitNormal = account ? DEBIT_NORMAL.has(account.type) : true;

  const rows = useMemo(() => {
    let bal = 0;
    return lines.map((l) => {
      const d = Number(l.debit),
        c = Number(l.credit);
      bal += debitNormal ? d - c : c - d;
      return { ...l, balance: bal };
    });
  }, [lines, debitNormal]);
  const totals = useMemo(
    () => ({
      d: lines.reduce((s, l) => s + Number(l.debit), 0),
      c: lines.reduce((s, l) => s + Number(l.credit), 0),
    }),
    [lines],
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-1">General ledger</h1>
      <p className="text-muted-foreground mb-6">Every transaction posted to a given account.</p>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="col-span-2">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <th className="px-3 py-2 text-left w-28">Date</th>
              <th className="px-3 py-2 text-left">Reference</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-right w-28">Debit</th>
              <th className="px-3 py-2 text-right w-28">Credit</th>
              <th className="px-3 py-2 text-right w-32">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No transactions in this period.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.journal_entries?.entry_date}</td>
                <td className="px-3 py-2">
                  {r.journal_entries?.reference}
                  {r.journal_entries?.source_type && r.journal_entries.source_type !== "manual" && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted">
                      {r.journal_entries.source_type}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {r.description ?? r.journal_entries?.memo}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {Number(r.debit) ? fmt(Number(r.debit)) : ""}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {Number(r.credit) ? fmt(Number(r.credit)) : ""}
                </td>
                <td className="px-3 py-2 text-right font-mono">{fmt(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-muted/30">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right font-medium">
                  Totals
                </td>
                <td className="px-3 py-2 text-right font-mono">{fmt(totals.d)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(totals.c)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {fmt(rows[rows.length - 1].balance)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
