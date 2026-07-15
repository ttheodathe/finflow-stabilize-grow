import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banking/reconciliations")({
  head: () => ({ meta: [{ title: "Reconciliations — Free Accounting" }] }),
  component: ReconciliationsPage,
});

type BankAccount = {
  id: string;
  name: string;
  currency: string;
  current_balance: number;
  opening_balance: number;
};
type Txn = {
  id: string;
  txn_date: string;
  description: string;
  amount: number;
  reconciled: boolean;
  is_transfer: boolean;
};

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function ReconciliationsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [statementBalance, setStatementBalance] = useState("");
  const [showUnreconciledOnly, setShowUnreconciledOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  async function loadAccounts() {
    const { data } = await (supabase as any)
      .from("bank_accounts")
      .select("id,name,currency,current_balance,opening_balance")
      .eq("is_active", true)
      .order("name");
    if (data) {
      setAccounts(data as BankAccount[]);
      if (!accountId && data.length > 0) setAccountId(data[0].id);
    }
  }
  useEffect(() => {
    loadAccounts(); /* eslint-disable-next-line */
  }, []);

  async function loadTxns() {
    if (!accountId) {
      setTxns([]);
      return;
    }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("bank_transactions")
      .select("id,txn_date,description,amount,reconciled,is_transfer")
      .eq("bank_account_id", accountId)
      .order("txn_date", { ascending: false });
    if (error) toast.error(error.message);
    else setTxns(data as Txn[]);
    setLoading(false);
  }
  useEffect(() => {
    loadTxns(); /* eslint-disable-next-line */
  }, [accountId]);

  const account = accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? "USD";

  const reconciled = useMemo(() => txns.filter((t) => t.reconciled), [txns]);
  const unreconciled = useMemo(() => txns.filter((t) => !t.reconciled), [txns]);
  const reconciledTotal = useMemo(
    () => reconciled.reduce((s, t) => s + Number(t.amount), 0),
    [reconciled],
  );
  const reconciledBalance = (account ? Number(account.opening_balance) : 0) + reconciledTotal;
  const bookBalance = account ? Number(account.current_balance) : 0;
  const statementNum = statementBalance === "" ? null : Number(statementBalance);
  const difference = statementNum === null ? null : statementNum - reconciledBalance;

  const visible = showUnreconciledOnly ? unreconciled : txns;

  async function toggle(t: Txn, value: boolean) {
    const { error } = await (supabase as any)
      .from("bank_transactions")
      .update({ reconciled: value, reconciled_at: value ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    setTxns((prev) => prev.map((x) => (x.id === t.id ? { ...x, reconciled: value } : x)));
  }

  async function markAllVisible(value: boolean) {
    const ids = visible.map((t) => t.id);
    if (ids.length === 0) return;
    const { error } = await (supabase as any)
      .from("bank_transactions")
      .update({ reconciled: value, reconciled_at: value ? new Date().toISOString() : null })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(value ? "Marked as reconciled" : "Marked as unreconciled");
    loadTxns();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reconciliations</h1>
        <p className="text-muted-foreground">
          Match your books to a bank statement, one transaction at a time.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Label className="whitespace-nowrap">Statement ending balance</Label>
          <Input
            type="number"
            step="0.01"
            className="w-40"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Book balance</div>
            <div className="text-xl font-bold">{fmt(bookBalance, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Reconciled balance</div>
            <div className="text-xl font-bold">{fmt(reconciledBalance, currency)}</div>
            <div className="text-xs text-muted-foreground mt-1">{reconciled.length} matched</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Unmatched</div>
            <div className="text-xl font-bold">{unreconciled.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {fmt(
                unreconciled.reduce((s, t) => s + Number(t.amount), 0),
                currency,
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Difference vs statement</div>
            <div
              className={`text-xl font-bold ${difference !== null && Math.abs(difference) > 0.005 ? "text-red-600" : "text-emerald-600"}`}
            >
              {difference === null ? "—" : fmt(difference, currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-3">
        <Button
          variant={showUnreconciledOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnreconciledOnly((v) => !v)}
        >
          {showUnreconciledOnly ? "Showing unmatched only" : "Showing all transactions"}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllVisible(true)}>
            Mark all visible reconciled
          </Button>
          <Button variant="outline" size="sm" onClick={() => markAllVisible(false)}>
            Mark all visible unreconciled
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {showUnreconciledOnly ? "Everything is reconciled." : "No transactions yet."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Checkbox
                      checked={t.reconciled}
                      onCheckedChange={(v) => toggle(t, v === true)}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{t.txn_date}</TableCell>
                  <TableCell className="text-sm">
                    {t.description || "—"}{" "}
                    {t.is_transfer && (
                      <Badge variant="secondary" className="ml-1">
                        Transfer
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${Number(t.amount) < 0 ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {fmt(Number(t.amount), currency)}
                  </TableCell>
                  <TableCell>
                    {t.reconciled && <Badge variant="outline">Reconciled</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
