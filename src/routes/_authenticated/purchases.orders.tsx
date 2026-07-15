import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { Plus, Trash2, CheckCircle2, PackageCheck, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/purchases/orders")({
  head: () => ({ meta: [{ title: "Purchase orders — Free Accounting" }] }),
  component: POPage,
});

type Vendor = { id: string; name: string };
type Account = { id: string; code: string; name: string; type: string };
type PO = {
  id: string;
  vendor_id: string | null;
  po_number: string;
  order_date: string;
  expected_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  converted_bill_id: string | null;
  vendors?: { name: string } | null;
};
type Line = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  account_id: string;
};

const emptyLine: Line = {
  description: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  account_id: "",
};
const fmt = (n: number, c = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);

function POPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PO[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vendor_id: "",
    po_number: "",
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: "",
    currency: "USD",
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);

  async function load() {
    const [p, v, a] = await Promise.all([
      (supabase as any)
        .from("purchase_orders")
        .select("*, vendors(name)")
        .order("order_date", { ascending: false }),
      (supabase as any).from("vendors").select("id,name").order("name"),
      (supabase as any)
        .from("accounts")
        .select("id,code,name,type")
        .eq("is_active", true)
        .order("code"),
    ]);
    if (p.data) setItems(p.data as PO[]);
    if (v.data) setVendors(v.data as Vendor[]);
    if (a.data) setAccounts(a.data as Account[]);
  }
  useEffect(() => {
    load();
  }, []);

  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "expense"), [accounts]);

  function openNew() {
    setForm({
      vendor_id: "",
      po_number: `PO-${Date.now().toString().slice(-6)}`,
      order_date: new Date().toISOString().slice(0, 10),
      expected_date: "",
      currency: "USD",
      notes: "",
    });
    setLines([{ ...emptyLine, account_id: expenseAccounts[0]?.id ?? "" }]);
    setOpen(true);
  }

  const totals = useMemo(() => {
    let sub = 0,
      tax = 0;
    for (const l of lines) {
      const amt = Number(l.quantity) * Number(l.unit_price);
      sub += amt;
      tax += amt * (Number(l.tax_rate) / 100);
    }
    return { subtotal: sub, tax, total: sub + tax };
  }, [lines]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!form.vendor_id) return toast.error("Pick a vendor");
    if (lines.some((l) => !l.description)) return toast.error("Every line needs a description");
    const { data: po, error } = await (supabase as any)
      .from("purchase_orders")
      .insert({
        user_id: u.user.id,
        vendor_id: form.vendor_id,
        po_number: form.po_number,
        order_date: form.order_date,
        expected_date: form.expected_date || null,
        currency: form.currency,
        notes: form.notes || null,
        status: "draft",
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const rows = lines.map((l) => ({
      user_id: u.user.id,
      po_id: po.id,
      account_id: l.account_id || null,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      amount: Number(l.quantity) * Number(l.unit_price),
    }));
    const { error: ie } = await (supabase as any).from("purchase_order_items").insert(rows);
    if (ie) return toast.error(ie.message);
    toast.success("Purchase order saved");
    setOpen(false);
    load();
  }

  async function setStatus(id: string, status: string) {
    const { error } = await (supabase as any)
      .from("purchase_orders")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    load();
  }

  async function convertToBill(po: PO) {
    if (po.converted_bill_id) return toast.info("Already converted to a bill");
    if (po.status !== "approved" && po.status !== "received")
      return toast.error("Approve or receive the PO first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: poItems, error: e1 } = await (supabase as any)
      .from("purchase_order_items")
      .select("*")
      .eq("po_id", po.id);
    if (e1) return toast.error(e1.message);
    const defExp = expenseAccounts[0]?.id;
    const { data: bill, error: e2 } = await (supabase as any)
      .from("bills")
      .insert({
        user_id: u.user.id,
        vendor_id: po.vendor_id,
        bill_number: `BILL-${po.po_number}`,
        reference: po.po_number,
        issue_date: new Date().toISOString().slice(0, 10),
        currency: po.currency,
        subtotal: po.subtotal,
        tax: po.tax,
        total: po.total,
        status: "open",
        notes: `Converted from ${po.po_number}`,
      })
      .select()
      .single();
    if (e2) return toast.error(e2.message);
    const billItems = (poItems ?? []).map((l: any) => ({
      user_id: u.user.id,
      bill_id: bill.id,
      item_id: l.item_id,
      account_id: l.account_id ?? defExp,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      amount: l.amount,
    }));
    if (billItems.length) {
      const { error: e3 } = await (supabase as any).from("bill_items").insert(billItems);
      if (e3) return toast.error(e3.message);
    }
    await (supabase as any).from("bills").update({ status: "open" }).eq("id", bill.id);
    await (supabase as any)
      .from("purchase_orders")
      .update({ converted_bill_id: bill.id, status: "received" })
      .eq("id", po.id);
    toast.success("Bill created from PO");
    navigate({ to: "/purchases/bills" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this PO?")) return;
    const { error } = await (supabase as any).from("purchase_orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Purchase orders</h1>
          <p className="text-muted-foreground">
            Create POs, approve, and convert into bills on receipt.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New PO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>New purchase order</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Vendor</Label>
                  <Select
                    value={form.vendor_id}
                    onValueChange={(v) => setForm({ ...form, vendor_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>PO #</Label>
                  <Input
                    required
                    value={form.po_number}
                    onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label>Order date</Label>
                  <Input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expected</Label>
                  <Input
                    type="date"
                    value={form.expected_date}
                    onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLines([
                        ...lines,
                        { ...emptyLine, account_id: expenseAccounts[0]?.id ?? "" },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3" /> Add line
                  </Button>
                </div>
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Input
                          placeholder="Description"
                          value={l.description}
                          onChange={(e) => {
                            const n = [...lines];
                            n[i].description = e.target.value;
                            setLines(n);
                          }}
                        />
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={l.account_id}
                          onValueChange={(v) => {
                            const n = [...lines];
                            n[i].account_id = v;
                            setLines(n);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Expense acct" />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseAccounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.code} {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          value={l.quantity}
                          onChange={(e) => {
                            const n = [...lines];
                            n[i].quantity = Number(e.target.value);
                            setLines(n);
                          }}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={l.unit_price}
                          onChange={(e) => {
                            const n = [...lines];
                            n[i].unit_price = Number(e.target.value);
                            setLines(n);
                          }}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Tax %"
                          value={l.tax_rate}
                          onChange={(e) => {
                            const n = [...lines];
                            n[i].tax_rate = Number(e.target.value);
                            setLines(n);
                          }}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setLines(lines.filter((_, k) => k !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-56 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{fmt(totals.subtotal, form.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{fmt(totals.tax, form.currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base border-t pt-1">
                    <span>Total</span>
                    <span>{fmt(totals.total, form.currency)}</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero">
                Save PO
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No purchase orders yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Order date</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-64"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.po_number}</TableCell>
                  <TableCell>{p.vendors?.name ?? "—"}</TableCell>
                  <TableCell>{p.order_date}</TableCell>
                  <TableCell>{p.expected_date ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "received"
                          ? "default"
                          : p.status === "approved"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {p.status}
                    </Badge>
                    {p.converted_bill_id && (
                      <Badge variant="secondary" className="ml-1">
                        billed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{fmt(Number(p.total), p.currency)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {p.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(p.id, "approved")}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Approve
                      </Button>
                    )}
                    {p.status === "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus(p.id, "received")}
                      >
                        <PackageCheck className="h-3 w-3" /> Receive
                      </Button>
                    )}
                    {(p.status === "approved" || p.status === "received") &&
                      !p.converted_bill_id && (
                        <Button size="sm" onClick={() => convertToBill(p)}>
                          <FileText className="h-3 w-3" /> To bill
                        </Button>
                      )}
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
