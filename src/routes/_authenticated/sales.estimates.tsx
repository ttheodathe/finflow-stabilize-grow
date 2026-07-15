import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Plus, Pencil, Trash2, X, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { CurrencySelect } from "@/components/currency-select";
import { useDefaultCurrency } from "@/hooks/use-currency";

export const Route = createFileRoute("/_authenticated/sales/estimates")({
  head: () => ({ meta: [{ title: "Estimates — Free Accounting" }] }),
  component: EstimatesPage,
});

type Estimate = {
  id: string;
  estimate_number: string;
  customer_id: string | null;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  converted_invoice_id: string | null;
  customers?: { name: string } | null;
};
type Customer = { id: string; name: string };
type CatalogItem = { id: string; name: string; price: number; tax_rate: number };
type Line = {
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

const STATUSES = ["draft", "sent", "accepted", "declined", "converted"];
const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

function EstimatesPage() {
  const navigate = useNavigate();
  const defaultCurrency = useDefaultCurrency();
  const [items, setItems] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Estimate | null>(null);
  const [form, setForm] = useState({
    estimate_number: "",
    customer_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    status: "draft",
    currency: defaultCurrency,
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([]);

  async function load() {
    const [est, cust, cat] = await Promise.all([
      (supabase as any)
        .from("estimates")
        .select("*, customers(name)")
        .order("issue_date", { ascending: false }),
      supabase.from("customers").select("id,name").order("name"),
      supabase.from("items").select("id,name,price,tax_rate").eq("is_active", true).order("name"),
    ]);
    if (est.error) toast.error(est.error.message);
    else setItems(est.data as Estimate[]);
    if (cust.data) setCustomers(cust.data as Customer[]);
    if (cat.data) setCatalog(cat.data as CatalogItem[]);
  }
  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0,
      tax = 0;
    for (const l of lines) {
      const a = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
      subtotal += a;
      tax += a * ((Number(l.tax_rate) || 0) / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  function openNew() {
    setEditing(null);
    setForm({
      estimate_number: `EST-${Date.now().toString().slice(-6)}`,
      customer_id: "",
      issue_date: new Date().toISOString().slice(0, 10),
      expiry_date: "",
      status: "draft",
      currency: defaultCurrency,
      notes: "",
    });
    setLines([]);
    setOpen(true);
  }
  async function openEdit(e: Estimate) {
    setEditing(e);
    setForm({
      estimate_number: e.estimate_number,
      customer_id: e.customer_id ?? "",
      issue_date: e.issue_date,
      expiry_date: e.expiry_date ?? "",
      status: e.status,
      currency: e.currency,
      notes: "",
    });
    const { data } = await (supabase as any)
      .from("estimate_items")
      .select("item_id,description,quantity,unit_price,tax_rate")
      .eq("estimate_id", e.id);
    setLines(
      (data ?? []).map((d: any) => ({
        item_id: d.item_id,
        description: d.description,
        quantity: Number(d.quantity),
        unit_price: Number(d.unit_price),
        tax_rate: Number(d.tax_rate ?? 0),
      })),
    );
    setOpen(true);
  }

  function addCatalog(id: string) {
    const it = catalog.find((c) => c.id === id);
    if (!it) return;
    setLines((l) => [
      ...l,
      {
        item_id: it.id,
        description: it.name,
        quantity: 1,
        unit_price: Number(it.price),
        tax_rate: Number(it.tax_rate),
      },
    ]);
  }
  const addBlank = () =>
    setLines((l) => [
      ...l,
      { item_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
    ]);
  const updateLine = (i: number, p: Partial<Line>) =>
    setLines((l) => l.map((ln, idx) => (idx === i ? { ...ln, ...p } : ln)));
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload: any = {
      user_id: u.user.id,
      estimate_number: form.estimate_number,
      customer_id: form.customer_id || null,
      issue_date: form.issue_date,
      expiry_date: form.expiry_date || null,
      status: form.status,
      currency: form.currency,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      notes: form.notes,
    };
    let estId = editing?.id;
    if (editing) {
      const { error } = await (supabase as any)
        .from("estimates")
        .update(payload)
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await (supabase as any)
        .from("estimates")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) return toast.error(error?.message ?? "Insert failed");
      estId = data.id;
    }
    if (estId) {
      await (supabase as any).from("estimate_items").delete().eq("estimate_id", estId);
      if (lines.length > 0) {
        const rows = lines.map((l) => ({
          estimate_id: estId,
          user_id: u.user!.id,
          item_id: l.item_id,
          description: l.description || "Item",
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          tax_rate: Number(l.tax_rate) || 0,
          amount: (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        }));
        const { error } = await (supabase as any).from("estimate_items").insert(rows);
        if (error) return toast.error(error.message);
      }
    }
    toast.success(editing ? "Estimate updated" : "Estimate created");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this estimate?")) return;
    const { error } = await (supabase as any).from("estimates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  async function convertToInvoice(est: Estimate) {
    if (est.converted_invoice_id) {
      toast.info("Already converted");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: estLines } = await (supabase as any)
      .from("estimate_items")
      .select("item_id,description,quantity,unit_price,tax_rate,amount")
      .eq("estimate_id", est.id);
    const invPayload = {
      user_id: u.user.id,
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      customer_id: est.customer_id,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      status: "draft",
      currency: est.currency,
      subtotal: est.subtotal,
      tax: est.tax,
      total: est.total,
      notes: `Converted from estimate ${est.estimate_number}`,
    };
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert(invPayload)
      .select("id")
      .single();
    if (error || !inv) return toast.error(error?.message ?? "Failed");
    if (estLines && estLines.length > 0) {
      const rows = estLines.map((l: any) => ({
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
      .from("estimates")
      .update({ status: "converted", converted_invoice_id: inv.id })
      .eq("id", est.id);
    toast.success("Converted to invoice");
    navigate({ to: "/invoices" });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Estimates</h1>
          <p className="text-muted-foreground">
            Send quotes and proposals; convert them to invoices in one click.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit estimate" : "New estimate"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estimate #</Label>
                  <Input
                    required
                    value={form.estimate_number}
                    onChange={(e) => setForm({ ...form, estimate_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Customer</Label>
                  <Select
                    value={form.customer_id}
                    onValueChange={(v) => setForm({ ...form, customer_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Issue date</Label>
                  <Input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expiry date</Label>
                  <Input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Currency</Label>
                <CurrencySelect
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                />
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Line items</Label>
                  <div className="flex gap-2">
                    <Select value="" onValueChange={addCatalog}>
                      <SelectTrigger className="w-48 h-8">
                        <SelectValue placeholder="+ Add from catalog" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No items yet
                          </div>
                        )}
                        {catalog.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} — {fmt(c.price, form.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="outline" onClick={addBlank}>
                      + Blank
                    </Button>
                  </div>
                </div>
                {lines.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Add items to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lines.map((l, i) => {
                      const amount = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
                      return (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Input
                              placeholder="Description"
                              value={l.description}
                              onChange={(e) => updateLine(i, { description: e.target.value })}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={l.quantity}
                              onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={l.unit_price}
                              onChange={(e) =>
                                updateLine(i, { unit_price: Number(e.target.value) })
                              }
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={l.tax_rate}
                              onChange={(e) => updateLine(i, { tax_rate: Number(e.target.value) })}
                            />
                          </div>
                          <div className="col-span-2 text-right text-sm tabular-nums">
                            {fmt(amount + amount * (l.tax_rate / 100), form.currency)}
                          </div>
                          <div className="col-span-1 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(i)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{fmt(totals.subtotal, form.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="tabular-nums">{fmt(totals.tax, form.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-1">
                    <span>Total</span>
                    <span className="tabular-nums">{fmt(totals.total, form.currency)}</span>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save estimate
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No estimates yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.estimate_number}</TableCell>
                  <TableCell>{e.customers?.name ?? "—"}</TableCell>
                  <TableCell>{e.issue_date}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "converted" ? "default" : "secondary"}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(Number(e.total), e.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => convertToInvoice(e)}
                      title="Convert to invoice"
                      disabled={!!e.converted_invoice_id}
                    >
                      <FileCheck className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
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
