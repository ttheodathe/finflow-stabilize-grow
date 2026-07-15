import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Play } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sales/recurring")({
  head: () => ({ meta: [{ title: "Recurring invoices — Free Accounting" }] }),
  component: RecurringPage,
});

type Recurring = {
  id: string;
  template_invoice_id: string;
  customer_id: string | null;
  frequency: string;
  next_run_date: string;
  last_run_date: string | null;
  is_active: boolean;
  invoices?: { invoice_number: string; total: number; currency: string } | null;
  customers?: { name: string } | null;
};
type Invoice = { id: string; invoice_number: string; customer_id: string | null; total: number };

const FREQ = ["weekly", "monthly", "annual"];

function addPeriod(dateStr: string, freq: string): string {
  const d = new Date(dateStr);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "annual") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function RecurringPage() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    template_invoice_id: "",
    frequency: "monthly",
    next_run_date: new Date().toISOString().slice(0, 10),
    is_active: true,
  });

  async function load() {
    const [rec, inv] = await Promise.all([
      (supabase as any)
        .from("recurring_invoices")
        .select("*, invoices!template_invoice_id(invoice_number,total,currency), customers(name)")
        .order("next_run_date"),
      supabase
        .from("invoices")
        .select("id,invoice_number,customer_id,total")
        .order("issue_date", { ascending: false }),
    ]);
    if (rec.error) toast.error(rec.error.message);
    else setItems(rec.data as Recurring[]);
    if (inv.data) setInvoices(inv.data as Invoice[]);
  }
  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const inv = invoices.find((i) => i.id === form.template_invoice_id);
    if (!inv) return toast.error("Pick a template invoice");
    const { error } = await (supabase as any).from("recurring_invoices").insert({
      user_id: u.user.id,
      template_invoice_id: inv.id,
      customer_id: inv.customer_id,
      frequency: form.frequency,
      next_run_date: form.next_run_date,
      is_active: form.is_active,
    });
    if (error) return toast.error(error.message);
    toast.success("Scheduled");
    setOpen(false);
    load();
  }

  async function toggle(r: Recurring) {
    await (supabase as any)
      .from("recurring_invoices")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this schedule?")) return;
    await (supabase as any).from("recurring_invoices").delete().eq("id", id);
    load();
  }

  async function runNow(r: Recurring) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    // Clone the template invoice + its items
    const { data: src } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", r.template_invoice_id)
      .single();
    if (!src) return toast.error("Template not found");
    const { data: srcLines } = await supabase
      .from("invoice_items")
      .select("item_id,description,quantity,unit_price,tax_rate,amount")
      .eq("invoice_id", r.template_invoice_id);
    const newPayload = {
      user_id: u.user.id,
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      customer_id: (src as any).customer_id,
      issue_date: r.next_run_date,
      due_date: null,
      status: "draft",
      currency: (src as any).currency,
      subtotal: (src as any).subtotal,
      tax: (src as any).tax,
      total: (src as any).total,
      notes: `Recurring from ${(src as any).invoice_number}`,
    };
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert(newPayload)
      .select("id")
      .single();
    if (error || !inv) return toast.error(error?.message ?? "Failed");
    if (srcLines && srcLines.length > 0) {
      const rows = srcLines.map((l: any) => ({
        invoice_id: inv.id,
        user_id: u.user!.id,
        item_id: l.item_id,
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        tax_rate: Number(l.tax_rate ?? 0),
        amount: Number(l.amount ?? 0),
      }));
      await supabase.from("invoice_items").insert(rows);
    }
    await (supabase as any)
      .from("recurring_invoices")
      .update({
        last_run_date: r.next_run_date,
        next_run_date: addPeriod(r.next_run_date, r.frequency),
      })
      .eq("id", r.id);
    toast.success("New invoice generated");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Recurring invoices</h1>
          <p className="text-muted-foreground">
            Auto-generate invoices from a template on a weekly/monthly/annual schedule.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule recurring invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label>Template invoice</Label>
                <Select
                  value={form.template_invoice_id}
                  onValueChange={(v) => setForm({ ...form, template_invoice_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick an existing invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.invoice_number} — {Number(i.total).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={form.frequency}
                    onValueChange={(v) => setForm({ ...form, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQ.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Next run</Label>
                  <Input
                    type="date"
                    value={form.next_run_date}
                    onChange={(e) => setForm({ ...form, next_run_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Active</Label>
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save schedule
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No recurring schedules yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next</TableHead>
                <TableHead>Last</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.invoices?.invoice_number ?? "—"}</TableCell>
                  <TableCell>{r.customers?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{r.frequency}</TableCell>
                  <TableCell>{r.next_run_date}</TableCell>
                  <TableCell>{r.last_run_date ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={r.is_active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggle(r)}
                    >
                      {r.is_active ? "active" : "paused"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => runNow(r)}
                      title="Generate now"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
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
