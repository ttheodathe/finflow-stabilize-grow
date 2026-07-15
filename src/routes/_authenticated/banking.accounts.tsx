import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Landmark, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/banking/accounts")({
  head: () => ({ meta: [{ title: "Bank accounts — Free Accounting" }] }),
  component: BankAccountsPage,
});

type BankAccountType = "bank" | "cash" | "credit_card";
type BankAccount = {
  id: string;
  name: string;
  type: BankAccountType;
  currency: string;
  account_number_last4: string | null;
  opening_balance: number;
  current_balance: number;
  gl_account_id: string | null;
  is_active: boolean;
};
type GlAccount = { id: string; code: string; name: string; type: string };

const TYPE_LABEL: Record<BankAccountType, string> = {
  bank: "Bank",
  cash: "Cash",
  credit_card: "Credit card",
};
const TYPE_ICON: Record<BankAccountType, typeof Landmark> = {
  bank: Landmark,
  cash: Wallet,
  credit_card: CreditCard,
};

const emptyForm = {
  name: "",
  type: "bank" as BankAccountType,
  currency: "USD",
  account_number_last4: "",
  opening_balance: "0",
  gl_account_id: "",
  is_active: true,
};

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<GlAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [a, g] = await Promise.all([
      (supabase as any).from("bank_accounts").select("*").order("name"),
      (supabase as any)
        .from("accounts")
        .select("id,code,name,type")
        .eq("is_active", true)
        .order("code"),
    ]);
    if (a.error) toast.error(a.error.message);
    else setAccounts(a.data as BankAccount[]);
    if (g.data) setGlAccounts(g.data as GlAccount[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const totalsByType = useMemo(() => {
    const totals: Record<string, number> = { bank: 0, cash: 0, credit_card: 0 };
    for (const a of accounts) totals[a.type] += Number(a.current_balance);
    return totals;
  }, [accounts]);

  function openNew() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }
  function openEdit(a: BankAccount) {
    setEditing(a);
    setForm({
      name: a.name,
      type: a.type,
      currency: a.currency,
      account_number_last4: a.account_number_last4 ?? "",
      opening_balance: String(a.opening_balance),
      gl_account_id: a.gl_account_id ?? "",
      is_active: a.is_active,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!form.name.trim()) return toast.error("Name is required");

    if (editing) {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        currency: form.currency,
        account_number_last4: form.account_number_last4.trim() || null,
        gl_account_id: form.gl_account_id || null,
        is_active: form.is_active,
      };
      const { error } = await (supabase as any)
        .from("bank_accounts")
        .update(payload)
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Account updated");
    } else {
      const opening = Number(form.opening_balance) || 0;
      const payload = {
        user_id: u.user.id,
        name: form.name.trim(),
        type: form.type,
        currency: form.currency,
        account_number_last4: form.account_number_last4.trim() || null,
        opening_balance: opening,
        current_balance: opening,
        gl_account_id: form.gl_account_id || null,
        is_active: form.is_active,
      };
      const { error } = await (supabase as any).from("bank_accounts").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Account created");
    }
    setOpen(false);
    load();
  }

  async function remove(a: BankAccount) {
    if (!confirm(`Delete "${a.name}"? All its transactions and transfers will be removed too.`))
      return;
    const { error } = await (supabase as any).from("bank_accounts").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Account deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Bank accounts</h1>
          <p className="text-muted-foreground">
            Every bank account, cash drawer, and credit card you use.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Equity Bank Rwanda — Checking"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm({ ...form, type: v as BankAccountType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit_card">Credit card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    maxLength={3}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Last 4 digits (optional)</Label>
                  <Input
                    value={form.account_number_last4}
                    onChange={(e) => setForm({ ...form, account_number_last4: e.target.value })}
                    maxLength={4}
                  />
                </div>
                <div>
                  <Label>Opening balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.opening_balance}
                    onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                    disabled={!!editing}
                  />
                  {editing && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Use a manual transaction or transfer to change the balance after creation.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label>Linked ledger account (optional)</Label>
                <Select
                  value={form.gl_account_id}
                  onValueChange={(v) => setForm({ ...form, gl_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
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
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Active</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {(["bank", "cash", "credit_card"] as BankAccountType[]).map((t) => {
          const Icon = TYPE_ICON[t];
          return (
            <Card key={t}>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-full bg-muted p-2">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{TYPE_LABEL[t]} total</div>
                  <div className="text-xl font-bold">{fmt(totalsByType[t])}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No bank accounts yet. Add your first one to start tracking cash flow.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-24"></TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{TYPE_LABEL[a.type]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.account_number_last4 ? `•••• ${a.account_number_last4}` : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${Number(a.current_balance) < 0 ? "text-red-600" : ""}`}
                  >
                    {fmt(Number(a.current_balance), a.currency)}
                  </TableCell>
                  <TableCell>
                    {!a.is_active && <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(a)}>
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
