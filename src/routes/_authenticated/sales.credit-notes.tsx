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

export const Route = createFileRoute("/_authenticated/sales/credit-notes")({
  head: () => ({ meta: [{ title: "Credit notes — Free Accounting" }] }),
  component: CreditNotesPage,
});

type CN = {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  issue_date: string;
  reason: string | null;
  amount: number;
  currency: string;
  status: string;
  invoices?: { invoice_number: string; total: number; currency: string } | null;
  customers?: { name: string } | null;
};
type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  total: number;
  currency: string;
};

const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

function CreditNotesPage() {
  const [items, setItems] = useState<CN[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    credit_note_number: "",
    invoice_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    amount: 0,
    reason: "",
    status: "issued",
  });

  async function load() {
    const [cn, inv] = await Promise.all([
      (supabase as any)
        .from("credit_notes")
        .select("*, invoices(invoice_number,total,currency), customers(name)")
        .order("issue_date", { ascending: false }),
      supabase
        .from("invoices")
        .select("id,invoice_number,customer_id,total,currency")
        .order("issue_date", { ascending: false }),
    ]);
    if (cn.error) toast.error(cn.error.message);
    else setItems(cn.data as CN[]);
    if (inv.data) setInvoices(inv.data as Invoice[]);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({
      credit_note_number: `CN-${Date.now().toString().slice(-6)}`,
      invoice_id: "",
      issue_date: new Date().toISOString().slice(0, 10),
      amount: 0,
      reason: "",
      status: "issued",
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
    const { error } = await (supabase as any).from("credit_notes").insert({
      user_id: u.user.id,
      credit_note_number: form.credit_note_number,
      invoice_id: inv.id,
      customer_id: inv.customer_id,
      issue_date: form.issue_date,
      reason: form.reason,
      amount: form.amount,
      currency: inv.currency,
      status: form.status,
    });
    if (error) return toast.error(error.message);
    toast.success("Credit note issued");
    setOpen(false);
    load();
  }

  async function voidCn(id: string) {
    if (!confirm("Void this credit note?")) return;
    await (supabase as any).from("credit_notes").update({ status: "void" }).eq("id", id);
    toast.success("Voided");
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this credit note?")) return;
    await (supabase as any).from("credit_notes").delete().eq("id", id);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Credit notes</h1>
          <p className="text-muted-foreground">
            Issue refunds and credits against existing invoices with full audit trail.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New credit note
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue credit note</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Credit note #</Label>
                <Input
                  required
                  value={form.credit_note_number}
                  onChange={(e) => setForm({ ...form, credit_note_number: e.target.value })}
                />
              </div>
              <div>
                <Label>Against invoice</Label>
                <Select
                  value={form.invoice_id}
                  onValueChange={(v) => setForm({ ...form, invoice_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number} — {fmt(i.total, i.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
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
              <div>
                <Label>Reason</Label>
                <Textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Why is this credit being issued?"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Issue credit note
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No credit notes yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.credit_note_number}</TableCell>
                  <TableCell>{c.invoices?.invoice_number ?? "—"}</TableCell>
                  <TableCell>{c.customers?.name ?? "—"}</TableCell>
                  <TableCell>{c.issue_date}</TableCell>
                  <TableCell className="max-w-xs truncate">{c.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "void" ? "secondary" : "default"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(Number(c.amount), c.currency)}</TableCell>
                  <TableCell className="text-right">
                    {c.status !== "void" && (
                      <Button variant="ghost" size="sm" onClick={() => voidCn(c.id)}>
                        Void
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
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
