import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Plus, Trash2, DollarSign, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useServerFn } from "@tanstack/react-start";
import { extractDocument } from "@/lib/document-ai.functions";
import { GatedActionButton } from "@/components/gated-action-button";
import { BillReviewWorkspace } from "@/components/bill-review-workspace";

export const Route = createFileRoute("/_authenticated/purchases/bills")({
  head: () => ({ meta: [{ title: "Bills — Finflow Track" }] }),
  component: BillsPage,
});

type Vendor = { id: string; name: string; payment_terms: number };
type Account = { id: string; code: string; name: string; type: string };
type Bill = {
  id: string;
  vendor_id: string | null;
  bill_number: string;
  reference: string | null;
  issue_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
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

// Fix (currency field crash): the previous free-text currency <Input>
// let partial/invalid ISO codes (e.g. "U", "US", "", "EU") reach
// Intl.NumberFormat, which throws a RangeError on an invalid currency
// code. Because the totals block re-rendered fmt() on every keystroke,
// that throw happened mid-render with no error boundary, which made the
// field look like it "wasn't accepting" changes. Switching to a
// constrained Select removes the possibility of an invalid intermediate
// value, and fmt() below is also hardened as a defensive fallback.
const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "CNY",
  "INR",
  "NGN",
  "ZAR",
  "KES",
  "RWF",
];

const fmt = (n: number, c = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c || "USD",
    }).format(n || 0);
  } catch {
    // Fallback if an invalid/unsupported currency code ever slips through
    // (e.g. legacy data saved before this fix).
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n || 0);
  }
};

function BillsPage() {
  const companyId = useActiveCompanyId();
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paidMap, setPaidMap] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Bill | null>(null);
  const [form, setForm] = useState({
    vendor_id: "",
    bill_number: "",
    reference: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    currency: "USD",
    notes: "",
  });
  const [lines, setLines] = useState<Line[]>([{ ...emptyLine }]);
  const [pay, setPay] = useState({
    payment_date: "",
    amount: 0,
    method: "bank_transfer",
    reference: "",
    source_account_id: "",
    notes: "",
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const runScan = useServerFn(extractDocument);
  const [scanning, setScanning] = useState(false);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [reviewFileUrl, setReviewFileUrl] = useState<string | null>(null);
  const [reviewMimeType, setReviewMimeType] = useState<string | null>(null);

  async function onScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!companyId) return toast.error("Select a company first");
    if (file.size > 8 * 1024 * 1024) return toast.error("File must be under 8 MB.");
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return toast.error("Only image files (JPG/PNG/HEIC) or PDFs are supported for AI extraction.");
    }
    setScanning(true);
    const t = toast.loading("Uploading bill…");
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const { data: doc, error: docErr } = await supabase
        .from("documents")
        .insert({
          company_id: companyId,
          uploaded_by: u.user.id,
          doc_type: "bill",
          file_path: "",
          file_name: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
          status: "uploaded",
        })
        .select("id")
        .single();
      if (docErr || !doc) throw new Error(docErr?.message ?? "Could not create document record");

      const ext = file.name.split(".").pop() || "bin";
      const path = `${companyId}/${doc.id}/original.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (upErr) throw new Error(upErr.message);

      await supabase.from("documents").update({ file_path: path }).eq("id", doc.id);

      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 30);
      setReviewFileUrl(signed?.signedUrl ?? null);
      setReviewMimeType(file.type);
      setReviewDocId(doc.id);

      toast.success("Uploaded — AI is reading it now", { id: t });
      runScan({ data: { documentId: doc.id } }).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Extraction failed", { id: t });
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload that bill", { id: t });
    } finally {
      setScanning(false);
    }
  }

  async function load() {
    if (!companyId) return;
    const [b, v, a, sums] = await Promise.all([
      (supabase as any)
        .from("bills")
        .select("*, vendors(name)").eq("company_id", companyId)
        .order("issue_date", { ascending: false }),
      (supabase as any).from("vendors").select("id,name,payment_terms").eq("company_id", companyId).order("name"),
      (supabase as any)
        .from("accounts")
        .select("id,code,name,type").eq("company_id", companyId)
        .eq("is_active", true)
        .order("code"),
      (supabase as any).from("bill_payments").select("bill_id,amount").eq("company_id", companyId),
    ]);
    if (b.data) setBills(b.data as Bill[]);
    if (v.data) setVendors(v.data as Vendor[]);
    if (a.data) setAccounts(a.data as Account[]);
    const map: Record<string, number> = {};
    (sums.data ?? []).forEach((r: any) => {
      map[r.bill_id] = (map[r.bill_id] ?? 0) + Number(r.amount);
    });
    setPaidMap(map);
  }
  useEffect(() => {
    load();
  }, [companyId]);

  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "expense"), [accounts]);
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type === "asset"), [accounts]);

  function openNew() {
    setForm({
      vendor_id: "",
      bill_number: `BILL-${Date.now().toString().slice(-6)}`,
      reference: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: "",
      currency: "USD",
      notes: "",
    });
    setLines([{ ...emptyLine, account_id: expenseAccounts[0]?.id ?? "" }]);
  }
  function pickVendor(id: string) {
    const v = vendors.find((x) => x.id === id);
    const due = v
      ? new Date(Date.now() + (v.payment_terms || 0) * 86400000).toISOString().slice(0, 10)
      : "";
    setForm({ ...form, vendor_id: id, due_date: due });
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
    if (!companyId) return toast.error("Select a company first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!form.vendor_id) return toast.error("Pick a vendor");
    if (lines.some((l) => !l.description || !l.account_id))
      return toast.error("Every line needs a description & expense account");
    const { data: bill, error } = await (supabase as any)
      .from("bills")
      .insert({
        company_id: companyId,
        user_id: u.user.id,
        vendor_id: form.vendor_id,
        bill_number: form.bill_number,
        reference: form.reference || null,
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        currency: form.currency,
        notes: form.notes || null,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        status: "open",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    const items = lines.map((l) => ({
      company_id: companyId,
      user_id: u.user.id,
      bill_id: bill.id,
      account_id: l.account_id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      tax_rate: l.tax_rate,
      amount: Number(l.quantity) * Number(l.unit_price),
    }));
    const { error: ie } = await (supabase as any).from("bill_items").insert(items);
    if (ie) return toast.error(ie.message);
    // touch bill to trigger journal posting after lines exist
    await (supabase as any).from("bills").update({ status: "open" }).eq("id", bill.id);
    toast.success("Bill saved and posted to the ledger");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this bill? Related payments & ledger entries will be reversed.")) return;
    const { error } = await (supabase as any).from("bills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  function openPay(b: Bill) {
    const outstanding = Number(b.total) - (paidMap[b.id] ?? 0);
    setPay({
      payment_date: new Date().toISOString().slice(0, 10),
      amount: Math.max(0, outstanding),
      method: "bank_transfer",
      reference: "",
      source_account_id:
        assetAccounts.find((a) => a.code === "1010")?.id ?? assetAccounts[0]?.id ?? "",
      notes: "",
    });
    setPayOpen(b);
  }
  async function savePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payOpen) return;
    if (!companyId) return toast.error("Select a company first");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (pay.amount <= 0) return toast.error("Amount must be positive");
    const { error } = await (supabase as any).from("bill_payments").insert({
      company_id: companyId,
      user_id: u.user.id,
      bill_id: payOpen.id,
      vendor_id: payOpen.vendor_id,
      payment_date: pay.payment_date,
      amount: pay.amount,
      currency: payOpen.currency,
      method: pay.method,
      reference: pay.reference || null,
      source_account_id: pay.source_account_id || null,
      notes: pay.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded — banking & ledger updated");
    setPayOpen(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-muted-foreground">
            Vendor bills, due dates, and payments. Ledger updates automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onScan} />
          <GatedActionButton
            feature="documentAi"
            type="button"
            variant="outline"
            onAction={() => fileRef.current?.click()}
            disabled={scanning}
          >
            <ScanLine className="h-4 w-4" /> {scanning ? "Uploading…" : "Scan a bill"}
          </GatedActionButton>
          <Dialog
          open={open}
          onOpenChange={(o) => {
            // Fix (Jennifer QA — Bills: "+ New Bill- not clickable"): drive
            // dialog open state from a single source of truth
            // (onOpenChange) instead of relying on both Radix's internal
            // trigger toggle AND a separate onClick handler racing each
            // other. openNew() now runs from this single callback whenever
            // the dialog is being opened.
            if (o) openNew();
            setOpen(o);
          }}
        >
          <DialogTrigger asChild>
            <Button type="button" className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>New bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Vendor</Label>
                  <Select value={form.vendor_id} onValueChange={pickVendor}>
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
                  <Label>Bill #</Label>
                  <Input
                    required
                    value={form.bill_number}
                    onChange={(e) => setForm({ ...form, bill_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  />
                </div>
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
                  <Label>Currency</Label>
                  {/* Fix: was a free-text Input that allowed invalid/partial
                      ISO codes through to Intl.NumberFormat, which threw
                      mid-render and made the field appear unresponsive.
                      Constrained to a Select of known currency codes. */}
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setForm({ ...form, currency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                            <SelectValue placeholder="Expense account" />
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

              <div className="flex justify-end text-sm space-y-1">
                <div className="w-56 space-y-1">
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
                Save bill
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-card border rounded-xl">
        {bills.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No bills yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => {
                const paid = paidMap[b.id] ?? 0;
                const bal = Number(b.total) - paid;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.bill_number}</TableCell>
                    <TableCell>{b.vendors?.name ?? "—"}</TableCell>
                    <TableCell>{b.issue_date}</TableCell>
                    <TableCell>{b.due_date ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          b.status === "paid"
                            ? "default"
                            : b.status === "partial"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmt(Number(b.total), b.currency)}</TableCell>
                    <TableCell className="text-right">{fmt(paid, b.currency)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(bal, b.currency)}</TableCell>
                    <TableCell className="text-right">
                      {b.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => openPay(b)}>
                          <DollarSign className="h-3 w-3" /> Pay
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => remove(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay bill {payOpen?.bill_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={savePay} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={pay.payment_date}
                  onChange={(e) => setPay({ ...pay, payment_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={pay.amount}
                  onChange={(e) => setPay({ ...pay, amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Method</Label>
                <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["cash", "bank_transfer", "card", "check", "other"].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pay from account</Label>
                <Select
                  value={pay.source_account_id}
                  onValueChange={(v) => setPay({ ...pay, source_account_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Bank/Cash" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((a) => (
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
                value={pay.reference}
                onChange={(e) => setPay({ ...pay, reference: e.target.value })}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={pay.notes}
                onChange={(e) => setPay({ ...pay, notes: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-hero">
              Record payment
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BillReviewWorkspace
        open={!!reviewDocId}
        documentId={reviewDocId}
        fileUrl={reviewFileUrl}
        mimeType={reviewMimeType}
        vendors={vendors}
        expenseAccounts={expenseAccounts}
        defaultCurrency="USD"
        onClose={() => {
          setReviewDocId(null);
          setReviewFileUrl(null);
          setReviewMimeType(null);
        }}
        onApproved={() => {
          setReviewDocId(null);
          setReviewFileUrl(null);
          setReviewMimeType(null);
          load();
        }}
      />
    </div>
  );
}
