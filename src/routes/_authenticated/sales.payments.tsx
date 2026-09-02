import { createFileRoute } from "@tanstack/react-router";
import { scoped } from "@/lib/company-scope";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { lockExchangeRate } from "@/lib/fx-lock";

export const Route = createFileRoute("/_authenticated/sales/payments")({
  head: () => ({ meta: [{ title: "Payments received — Finflow Track" }] }),
  component: PaymentsPage,
});

type Payment = {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_currency_amount: number | null;
  method: string;
  reference: string | null;
  deposit_account_id: string | null;
  notes: string | null;
  invoices?: { invoice_number: string; total: number; status: string } | null;
  customers?: { name: string } | null;
  accounts?: { code: string; name: string } | null;
};
type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  total: number;
  currency: string;
  status: string;
};
type Account = { id: string; code: string; name: string; type: string };

const METHODS = ["cash", "bank_transfer", "card", "check", "other"];
const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

function PaymentsPage() {
  const companyId = useActiveCompanyId();
  const [items, setItems] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [revaluingId, setRevaluingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoice_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: 0,
    method: "bank_transfer",
    reference: "",
    deposit_account_id: "",
    notes: "",
  });
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!companyId) return;
    const [p, inv, acc] = await Promise.all([
      (supabase as any)
        .from("payments")
        .select(
          "*, invoices(invoice_number,total,status), customers(name), accounts:deposit_account_id(code,name)",
        ).eq("company_id", companyId)
        .order("payment_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("id,invoice_number,customer_id,total,currency,status").eq("company_id", companyId)
        .order("issue_date", { ascending: false }),
      (supabase as any)
        .from("accounts")
        .select("id,code,name,type").eq("company_id", companyId)
        .eq("type", "asset")
        .eq("is_active", true)
        .order("code"),
    ]);
    if (p.error) toast.error(p.error.message);
    else setItems(p.data as Payment[]);
    if (inv.data) setInvoices(inv.data as Invoice[]);
    if (acc.data) setAccounts(acc.data as Account[]);

    // compute paid totals
    const { data: sums } = await (supabase as any).from("payments").select("invoice_id, amount").eq("company_id", companyId);
    const map: Record<string, number> = {};
    (sums ?? []).forEach((r: any) => {
      map[r.invoice_id] = (map[r.invoice_id] ?? 0) + Number(r.amount);
    });
    setPaidMap(map);
  }
  useEffect(() => {
    load();
  }, [companyId]);

  function openNew() {
    const defaultBank = accounts.find((a) => a.code === "1010") ?? accounts[0];
    setForm({
      invoice_id: "",
      payment_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      method: "bank_transfer",
      reference: "",
      deposit_account_id: defaultBank?.id ?? "",
      notes: "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("Select a company first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const inv = invoices.find((i) => i.id === form.invoice_id);
    if (!inv) return toast.error("Pick an invoice");
    if (form.amount <= 0) return toast.error("Amount must be positive");

    setSaving(true);
    try {
      // Live rate at the moment of settlement — this can (and usually
      // will) differ from the rate the invoice originally locked, which
      // is exactly what lets us book an FX gain/loss on payment.
      const { rate, companyCurrency } = await lockExchangeRate(companyId, inv.currency);
      const baseCurrencyAmount =
        inv.currency === companyCurrency ? form.amount : form.amount * rate;

      const { error } = await (supabase as any).from("payments").insert(scoped({
        user_id: u.user.id,
        invoice_id: inv.id,
        customer_id: inv.customer_id,
        payment_date: form.payment_date,
        amount: form.amount,
        currency: inv.currency,
        exchange_rate: rate,
        base_currency_amount: baseCurrencyAmount,
        method: form.method,
        reference: form.reference || null,
        deposit_account_id: form.deposit_account_id || null,
        notes: form.notes || null,
      }));
      if (error) return toast.error(error.message);
      toast.success("Payment recorded — invoice status & general ledger updated");
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this payment? The invoice status and ledger entry will be reversed."))
      return;
    await (supabase as any).from("payments").delete().eq("id", id);
    toast.success("Deleted");
    load();
  }

  // Explicit revaluation of an OPEN (not fully paid) invoice at today's
  // live rate. This never changes the invoice's foreign-currency total —
  // only its base-currency reporting value — and posts an auditable FX
  // adjustment entry. Never runs automatically; the user has to ask for it.
  async function revalue(inv: Invoice) {
    if (!companyId) return;
    if (inv.status === "paid") return toast.error("Invoice is already fully paid");
    if (!confirm(
      `Revalue ${inv.invoice_number} at today's live rate? This updates its reporting ` +
      `value only — the ${inv.currency} amount owed by the customer does not change.`,
    )) return;
    setRevaluingId(inv.id);
    try {
      const { rate, companyCurrency } = await lockExchangeRate(companyId, inv.currency);
      if (inv.currency === companyCurrency) {
        toast.info("Invoice is already in the company's base currency — nothing to revalue");
        return;
      }
      const { error } = await supabase.rpc("revalue_open_transaction" as any, {
        _type: "invoice",
        _id: inv.id,
        _new_rate: rate,
      });
      if (error) return toast.error(error.message);
      toast.success("Invoice revalued at today's rate — FX adjustment posted to the ledger");
      load();
    } finally {
      setRevaluingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Payments received</h1>
          <p className="text-muted-foreground">
            Record customer payments; invoice status and general ledger update automatically.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> Record payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Invoice</Label>
                <Select
                  value={form.invoice_id}
                  onValueChange={(v) => {
                    const inv = invoices.find((i) => i.id === v);
                    const outstanding = inv ? Number(inv.total) - (paidMap[inv.id] ?? 0) : 0;
                    setForm({ ...form, invoice_id: v, amount: Math.max(0, outstanding) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((i) => {
                      const outstanding = Number(i.total) - (paidMap[i.id] ?? 0);
                      return (
                        <SelectItem key={i.id} value={i.id}>
                          {i.invoice_number} — outstanding {fmt(outstanding, i.currency)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Method</Label>
                  <Select
                    value={form.method}
                    onValueChange={(v) => setForm({ ...form, method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Deposit to account</Label>
                  <Select
                    value={form.deposit_account_id}
                    onValueChange={(v) => setForm({ ...form, deposit_account_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bank/Cash account" />
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
              </div>
              <div>
                <Label>Reference</Label>
                <Input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Check #, transaction ID..."
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero" disabled={saving}>
                {saving ? "Fetching live rate…" : "Record payment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl mb-6">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Open invoices</h2>
          <p className="text-sm text-muted-foreground">
            Revalue an open foreign-currency invoice at today's live rate. This only updates its
            reporting value in your books — the amount the customer owes stays exactly as billed.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="w-40"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices
              .filter((i) => i.status !== "paid")
              .map((i) => {
                const outstanding = Number(i.total) - (paidMap[i.id] ?? 0);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.invoice_number}</TableCell>
                    <TableCell>{i.currency}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{i.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmt(outstanding, i.currency)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revaluingId === i.id}
                        onClick={() => revalue(i)}
                      >
                        <RefreshCw className="h-3 w-3" />
                        {revaluingId === i.id ? "Revaluing…" : "Revalue at today's rate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            {invoices.filter((i) => i.status !== "paid").length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No open invoices.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No payments recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Deposit account</TableHead>
                <TableHead>Invoice status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.payment_date}</TableCell>
                  <TableCell className="font-medium">{p.invoices?.invoice_number ?? "—"}</TableCell>
                  <TableCell>{p.customers?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                  <TableCell>
                    {p.accounts ? `${p.accounts.code} ${p.accounts.name}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.invoices?.status === "paid" ? "default" : "secondary"}>
                      {p.invoices?.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(Number(p.amount), p.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
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
