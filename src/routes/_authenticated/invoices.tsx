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
import { Plus, Pencil, Trash2, X, Download } from "lucide-react";
import { toast } from "sonner";
import { CurrencySelect } from "@/components/currency-select";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Invoices — Free Accounting" }] }),
  component: InvoicesPage,
});

type Invoice = {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  customers?: { name: string } | null;
};
type Customer = { id: string; name: string };
type CatalogItem = {
  id: string;
  name: string;
  price: number;
  tax_rate: number;
  type: string;
  stock_quantity: number | null;
  track_inventory: boolean;
};
type Line = {
  item_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

const STATUSES = ["draft", "sent", "paid", "overdue"];

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function InvoicesPage() {
  const defaultCurrency = useDefaultCurrency();
  const [items, setItems] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    invoice_number: "",
    customer_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    status: "draft",
    currency: defaultCurrency,
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([]);

  async function load() {
    const [inv, cust, cat] = await Promise.all([
      supabase
        .from("invoices")
        .select("*, customers(name)")
        .order("issue_date", { ascending: false }),
      supabase.from("customers").select("id,name").order("name"),
      supabase
        .from("items")
        .select("id,name,price,tax_rate,type,stock_quantity,track_inventory")
        .eq("is_active", true)
        .order("name"),
    ]);
    if (inv.error) toast.error(inv.error.message);
    else setItems(inv.data as Invoice[]);
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
      const lineAmount = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
      subtotal += lineAmount;
      tax += lineAmount * ((Number(l.tax_rate) || 0) / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  function openNew() {
    setEditing(null);
    setForm({
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      customer_id: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      status: "draft",
      currency: defaultCurrency,
      notes: "",
    });
    setLines([]);
    setOpen(true);
  }
  async function openEdit(i: Invoice) {
    setEditing(i);
    setForm({
      invoice_number: i.invoice_number,
      customer_id: i.customer_id ?? "",
      issue_date: i.issue_date,
      due_date: i.due_date ?? "",
      status: i.status,
      currency: i.currency,
      notes: "",
    });
    const { data } = await supabase
      .from("invoice_items")
      .select("item_id,description,quantity,unit_price,tax_rate")
      .eq("invoice_id", i.id);
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

  function addCatalog(itemId: string) {
    const it = catalog.find((c) => c.id === itemId);
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
  function addBlank() {
    setLines((l) => [
      ...l,
      { item_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 0 },
    ]);
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((l) => l.map((ln, i) => (i === idx ? { ...ln, ...patch } : ln)));
  }
  function removeLine(idx: number) {
    setLines((l) => l.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = {
      user_id: u.user.id,
      invoice_number: form.invoice_number,
      customer_id: form.customer_id || null,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      status: form.status,
      currency: form.currency,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      notes: form.notes,
    };

    let invoiceId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("invoices").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("invoices").insert(payload).select("id").single();
      if (error || !data) return toast.error(error?.message ?? "Insert failed");
      invoiceId = data.id;
    }

    if (invoiceId) {
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      if (lines.length > 0) {
        const rows = lines.map((l) => ({
          invoice_id: invoiceId!,
          user_id: u.user!.id,
          item_id: l.item_id,
          description: l.description || "Item",
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          tax_rate: Number(l.tax_rate) || 0,
          amount: (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        }));
        const { error } = await supabase.from("invoice_items").insert(rows);
        if (error) return toast.error(error.message);
      }
    }

    toast.success(editing ? "Invoice updated" : "Invoice created");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this invoice?")) return;
    await supabase.from("invoice_items").delete().eq("invoice_id", id);
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  async function downloadPdf(inv: Invoice) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: company }, { data: customer }, { data: lineRows }] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("user_id", u.user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
      inv.customer_id
        ? supabase
            .from("customers")
            .select("name,email,address")
            .eq("id", inv.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("invoice_items")
        .select("description,quantity,unit_price,tax_rate")
        .eq("invoice_id", inv.id),
    ]);
    let logoSigned: string | null = null;
    if ((company as any)?.logo_url) {
      const { data: s } = await supabase.storage
        .from("company-logos")
        .createSignedUrl((company as any).logo_url, 3600);
      logoSigned = s?.signedUrl ?? null;
    }
    await generateInvoicePdf({
      invoice: {
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        currency: inv.currency,
        subtotal: Number(inv.subtotal),
        tax: Number(inv.tax),
        total: Number(inv.total),
        notes: null,
      },
      lines: (lineRows ?? []).map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        tax_rate: Number(l.tax_rate ?? 0),
      })),
      company: company ? { ...(company as any), logo_url: logoSigned } : null,
      customer: (customer as any) ?? null,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Create and track invoices using your real catalog.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit invoice" : "New invoice"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Invoice number</Label>
                  <Input
                    required
                    value={form.invoice_number}
                    onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
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
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
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
                            No products/services yet
                          </div>
                        )}
                        {catalog.map((c) => {
                          const stockLabel =
                            c.type === "product" && c.track_inventory
                              ? ` · stock: ${Number(c.stock_quantity ?? 0)}`
                              : "";
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} — {fmt(c.price, form.currency)}
                              {stockLabel}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button type="button" size="sm" variant="outline" onClick={addBlank}>
                      + Blank
                    </Button>
                  </div>
                </div>

                {lines.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Add a product or service to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lines.map((l, i) => {
                      const amount = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
                      const cat = l.item_id ? catalog.find((c) => c.id === l.item_id) : null;
                      const tracks = cat?.type === "product" && cat.track_inventory;
                      const stock = tracks ? Number(cat!.stock_quantity ?? 0) : null;
                      const over = stock !== null && Number(l.quantity) > stock;
                      return (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Input
                              placeholder="Description"
                              value={l.description}
                              onChange={(e) => updateLine(i, { description: e.target.value })}
                            />
                            {stock !== null && (
                              <div
                                className={`text-[11px] mt-0.5 ${over ? "text-rose-600" : "text-muted-foreground"}`}
                              >
                                Stock: {stock}
                                {over ? ` — insufficient (need ${l.quantity})` : ""}
                              </div>
                            )}
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
                    <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground pt-1 border-t">
                      <div className="col-span-5">Description</div>
                      <div className="col-span-1">Qty</div>
                      <div className="col-span-2">Unit price</div>
                      <div className="col-span-1">Tax %</div>
                      <div className="col-span-2 text-right">Amount</div>
                      <div className="col-span-1"></div>
                    </div>
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
                Save invoice
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No invoices yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>{i.customers?.name ?? "—"}</TableCell>
                  <TableCell>{i.issue_date}</TableCell>
                  <TableCell>
                    <Badge variant={i.status === "paid" ? "default" : "secondary"}>
                      {i.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(Number(i.total), i.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadPdf(i)}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(i)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(i.id)}>
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
