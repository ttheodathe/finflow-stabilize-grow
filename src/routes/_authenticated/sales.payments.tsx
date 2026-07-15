import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sales/payments")({
  head: () => ({ meta: [{ title: "Payments received — Free Accounting" }] }),
  component: PaymentsPage,
});

type Payment = {
  id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  currency: string;
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
  const [items, setItems] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
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

  async function load() {
    const [p, inv, acc] = await Promise.all([
      (supabase as any)
        .from("payments")
        .select(
          "*, invoices(invoice_number,total,status), customers(name), accounts:deposit_account_id(code,name)",
        )
        .order("payment_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("id,invoice_number,customer_id,total,currency,status")
        .order("issue_date", { ascending: false }),
      (supabase as any)
        .from("accounts")
        .select("id,code,name,type")
        .eq("type", "asset")
        .eq("is_active", true)
        .order("code"),
    ]);
    if (p.error) toast.error(p.error.message);
    else setItems(p.data as Payment[]);
    if (inv.data) setInvoices(inv.data as Invoice[]);
    if (acc.data) setAccounts(acc.data as Account[]);

    // compute paid totals
    const { data: sums } = await (supabase as any).from("payments").select("invoice_id, amount");
    const map: Record<string, number> = {};
    (sums ?? []).forEach((r: any) => {
      map[r.invoice_id] = (map[r.invoice_id] ?? 0) + Number(r.amount);
    });
    setPaidMap(map);
  }
  useEffect(() => {
    load();
  }, []);

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
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const inv = invoices.find((i) => i.id === form.invoice_id);
    if (!inv) return toast.error("Pick an invoice");
    if (form.amount <= 0) return toast.error("Amount must be positive");
    const { error } = await (supabase as any).from("payments").insert({
      user_id: u.user.id,
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      payment_date: form.payment_date,
      amount: form.amount,
      currency: inv.currency,
      method: form.method,
      reference: form.reference || null,
      deposit_account_id: form.deposit_account_id || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded — invoice status & general ledger updated");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this payment? The invoice status and ledger entry will be reversed."))
      return;
    await (supabase as any).from("payments").delete().eq("id", id);
    toast.success("Deleted");
    load();
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
              <Button type="submit" className="w-full bg-gradient-hero">
                Record payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
