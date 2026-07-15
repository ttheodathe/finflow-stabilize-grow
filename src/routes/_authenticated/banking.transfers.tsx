import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowRight, Trash2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banking/transfers")({
  head: () => ({ meta: [{ title: "Transfers — Free Accounting" }] }),
  component: TransfersPage,
});

type BankAccount = { id: string; name: string; currency: string; current_balance: number };
type Transfer = {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  notes: string | null;
  from?: { name: string } | null;
  to?: { name: string } | null;
};

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function TransfersPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [a, t] = await Promise.all([
      (supabase as any)
        .from("bank_accounts")
        .select("id,name,currency,current_balance")
        .eq("is_active", true)
        .order("name"),
      (supabase as any)
        .from("bank_transfers")
        .select("*, from:bank_accounts!from_account_id(name), to:bank_accounts!to_account_id(name)")
        .order("transfer_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (a.data) setAccounts(a.data as BankAccount[]);
    if (t.data) setTransfers(t.data as Transfer[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromId || !toId) return toast.error("Choose both accounts");
    if (fromId === toId) return toast.error("Pick two different accounts");
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a positive amount");

    setSaving(true);
    const { error } = await (supabase as any).rpc("create_bank_transfer", {
      _from_account_id: fromId,
      _to_account_id: toId,
      _amount: amt,
      _transfer_date: date,
      _notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Transfer recorded");
    setAmount("");
    setNotes("");
    load();
  }

  async function remove(t: Transfer) {
    if (!confirm("Delete this transfer? Both account balances will be reversed.")) return;
    const { error } = await (supabase as any).from("bank_transfers").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Transfer deleted and balances reversed");
    load();
  }

  const fromAccount = accounts.find((a) => a.id === fromId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Transfers</h1>
        <p className="text-muted-foreground">
          Move money between your own accounts and keep both balances accurate.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" /> New transfer
            </h3>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>From</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({fmt(Number(a.current_balance), a.currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div>
                <Label>To</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== fromId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              {fromAccount && (
                <p className="text-xs text-muted-foreground">
                  Available in {fromAccount.name}:{" "}
                  {fmt(Number(fromAccount.current_balance), fromAccount.currency)}
                </p>
              )}
              <div>
                <Label>Notes (optional)</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero" disabled={saving}>
                {saving ? "Saving…" : "Record transfer"}
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border rounded-xl">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Loading…</div>
            ) : transfers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No transfers yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.transfer_date}</TableCell>
                      <TableCell className="font-medium">{t.from?.name ?? "—"}</TableCell>
                      <TableCell>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{t.to?.name ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmt(Number(t.amount))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.notes ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => remove(t)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
