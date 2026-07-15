import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banking/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Free Accounting" }] }),
  component: TransactionsPage,
});

type BankAccount = { id: string; name: string; currency: string };
type GlAccount = { id: string; code: string; name: string; type: string };
type Txn = {
  id: string;
  bank_account_id: string;
  txn_date: string;
  description: string;
  amount: number;
  category_account_id: string | null;
  reference: string | null;
  is_transfer: boolean;
  reconciled: boolean;
  accounts?: { code: string; name: string } | null;
};

const emptyForm = {
  txn_date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  category_account_id: "",
  reference: "",
};

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function TransactionsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);

  async function loadAccounts() {
    const [a, g] = await Promise.all([
      (supabase as any)
        .from("bank_accounts")
        .select("id,name,currency")
        .eq("is_active", true)
        .order("name"),
      (supabase as any)
        .from("accounts")
        .select("id,code,name,type")
        .eq("is_active", true)
        .in("type", ["expense", "revenue"])
        .order("code"),
    ]);
    if (a.data) {
      setAccounts(a.data as BankAccount[]);
      if (!accountId && a.data.length > 0) setAccountId(a.data[0].id);
    }
    if (g.data) setGlAccounts(g.data as GlAccount[]);
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
      .select("*, accounts(code,name)")
      .eq("bank_account_id", accountId)
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setTxns(data as Txn[]);
    setLoading(false);
  }
  useEffect(() => {
    loadTxns(); /* eslint-disable-next-line */
  }, [accountId]);

  const visible = useMemo(
    () => (uncategorizedOnly ? txns.filter((t) => !t.category_account_id && !t.is_transfer) : txns),
    [txns, uncategorizedOnly],
  );

  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "USD";

  async function setCategory(id: string, categoryId: string) {
    const { error } = await (supabase as any)
      .from("bank_transactions")
      .update({ category_account_id: categoryId || null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setTxns((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category_account_id: categoryId || null } : t)),
    );
  }

  function openNew() {
    setForm({ ...emptyForm });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!accountId) return toast.error("Choose an account first");
    const amount = Number(form.amount);
    if (!amount) return toast.error("Enter a non-zero amount (negative for money out)");
    const payload = {
      user_id: u.user.id,
      bank_account_id: accountId,
      txn_date: form.txn_date,
      description: form.description.trim(),
      amount,
      category_account_id: form.category_account_id || null,
      reference: form.reference.trim() || null,
    };
    const { error } = await (supabase as any).from("bank_transactions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Transaction added");
    setOpen(false);
    loadTxns();
  }

  async function remove(t: Txn) {
    if (t.is_transfer)
      return toast.error("Delete this from the Transfers page instead — it will remove both sides");
    if (!confirm("Delete this transaction?")) return;
    const { error } = await (supabase as any).from("bank_transactions").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadTxns();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Search, categorize, and manage every transaction in an account.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero" disabled={!accountId}>
              <Plus className="h-4 w-4" /> New transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Description</Label>
                <Input
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.txn_date}
                    onChange={(e) => setForm({ ...form, txn_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="-50.00 or 250.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Positive = money in, negative = money out.
              </p>
              <div>
                <Label>Category (optional)</Label>
                <Select
                  value={form.category_account_id}
                  onValueChange={(v) => setForm({ ...form, category_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccounts.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
        <Button
          variant={uncategorizedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setUncategorizedOnly((v) => !v)}
        >
          Uncategorized only
        </Button>
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : !accountId ? (
          <div className="p-12 text-center text-muted-foreground">Add a bank account first.</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No transactions here yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20"></TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{t.txn_date}</TableCell>
                  <TableCell className="text-sm">
                    {t.description || "—"}
                    {t.reference && (
                      <div className="text-xs text-muted-foreground">Ref: {t.reference}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.is_transfer ? (
                      <Badge variant="secondary">Transfer</Badge>
                    ) : (
                      <Select
                        value={t.category_account_id ?? ""}
                        onValueChange={(v) => setCategory(t.id, v)}
                      >
                        <SelectTrigger className="w-52 h-8">
                          <SelectValue placeholder="Uncategorized" />
                        </SelectTrigger>
                        <SelectContent>
                          {glAccounts.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.code} {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
  );
}
