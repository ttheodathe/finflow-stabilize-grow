import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
import { Plus, Pencil, Trash2, Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { parseReceipt } from "@/lib/ai-receipts.functions";
import { categorizeExpenses } from "@/lib/ai-bookkeeper.functions";
import { CurrencySelect } from "@/components/currency-select";
import { useDefaultCurrency, useDateFormat, formatDate } from "@/hooks/use-currency";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — Free Accounting" }] }),
  component: ExpensesPage,
});

type Expense = {
  id: string;
  category: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
  expense_date: string;
  currency: string;
  // Fix (Jennifer QA — New Expense: vendor/category dropdowns, TIN,
  // supplier invoice reference, address for BIR reporting):
  vendor_id: string | null;
  account_id: string | null;
  supplier_invoice_number: string | null;
};

type Vendor = {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
};

type Account = { id: string; code: string; name: string; type: string };

function fmt(n: number, c = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function ExpensesPage() {
  const defaultCurrency = useDefaultCurrency();
  const dateFormat = useDateFormat();
  const [items, setItems] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    vendor_id: "",
    account_id: "",
    description: "",
    amount: "0",
    expense_date: new Date().toISOString().slice(0, 10),
    currency: defaultCurrency,
    supplier_invoice_number: "",
  });
  const runScan = useServerFn(parseReceipt);
  const runCategorize = useServerFn(categorizeExpenses);
  const [categorizing, setCategorizing] = useState(false);

  const selectedVendor = useMemo(
    () => vendors.find((v) => v.id === form.vendor_id) ?? null,
    [vendors, form.vendor_id],
  );

  async function autoCategorize() {
    setCategorizing(true);
    const t = toast.loading("AI is categorizing uncategorized expenses…");
    try {
      const { updated } = await runCategorize({});
      toast.success(
        updated > 0
          ? `Categorized ${updated} expense${updated > 1 ? "s" : ""}`
          : "No uncategorized expenses found",
        { id: t },
      );
      if (updated > 0) load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to categorize", { id: t });
    } finally {
      setCategorizing(false);
    }
  }

  async function load() {
    const [exp, ven, acc] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      // Fix (Jennifer QA — New Expense: "Vendor - No dropdown list for
      // selecting an existing vendor"): load the existing vendors table
      // (already used by Bills) instead of a free-text field.
      supabase.from("vendors").select("id,name,tax_id,address").order("name"),
      // Fix (Jennifer QA — New Expense: "Category - No dropdown list of the
      // Account Titles... allow selection from the chart of accounts"):
      supabase
        .from("accounts")
        .select("id,code,name,type")
        .eq("is_active", true)
        .eq("type", "expense")
        .order("code"),
    ]);
    if (exp.error) return toast.error(exp.error.message);
    setItems(exp.data as Expense[]);
    if (ven.data) setVendors(ven.data as Vendor[]);
    if (acc.data) setAccounts(acc.data as Account[]);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      vendor_id: "",
      account_id: "",
      description: "",
      amount: "0",
      // Fix (Jennifer QA — New Expense: "Date - it's the system default
      // despite the changes under Settings"):
      expense_date: new Date().toISOString().slice(0, 10),
      // Fix (Jennifer QA — New Expense: "Currency-USD is the default,
      // regardless of Settings"):
      currency: defaultCurrency,
      supplier_invoice_number: "",
    });
    setOpen(true);
  }
  function openEdit(x: Expense) {
    setEditing(x);
    setForm({
      vendor_id: x.vendor_id ?? "",
      account_id: x.account_id ?? "",
      description: x.description ?? "",
      amount: String(x.amount),
      expense_date: x.expense_date,
      currency: x.currency,
      supplier_invoice_number: x.supplier_invoice_number ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!form.vendor_id) return toast.error("Select a vendor");
    if (!form.account_id) return toast.error("Select an account/category");
    const vendor = vendors.find((v) => v.id === form.vendor_id);
    const account = accounts.find((a) => a.id === form.account_id);
    const payload = {
      vendor_id: form.vendor_id,
      vendor: vendor?.name ?? null, // keep legacy text column in sync
      account_id: form.account_id,
      category: account?.name ?? null, // keep legacy text column in sync
      description: form.description,
      amount: Number(form.amount) || 0,
      expense_date: form.expense_date,
      currency: form.currency,
      supplier_invoice_number: form.supplier_invoice_number || null,
      user_id: u.user.id,
    };
    const { error } = editing
      ? await supabase.from("expenses").update(payload).eq("id", editing.id)
      : await supabase.from("expenses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Expense updated" : "Expense added");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  async function onScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Receipt image must be under 8 MB.");
    setScanning(true);
    const t = toast.loading("AI is reading your receipt…");
    try {
      const dataUrl = await fileToDataUrl(file);
      const parsed = await runScan({ data: { imageDataUrl: dataUrl } });
      const matchedVendor = parsed.vendor
        ? vendors.find((v) => v.name.toLowerCase() === parsed.vendor!.toLowerCase())
        : null;
      const matchedAccount = parsed.category
        ? accounts.find((a) => a.name.toLowerCase() === parsed.category!.toLowerCase())
        : null;
      setEditing(null);
      setForm({
        vendor_id: matchedVendor?.id ?? "",
        account_id: matchedAccount?.id ?? "",
        description: parsed.description ?? "",
        amount: parsed.amount != null ? String(parsed.amount) : "0",
        expense_date: parsed.expense_date ?? new Date().toISOString().slice(0, 10),
        currency: parsed.currency || defaultCurrency,
        supplier_invoice_number: "",
      });
      setOpen(true);
      if (!matchedVendor || !matchedAccount) {
        toast.success("Receipt scanned — please confirm vendor & category, then save", { id: t });
      } else {
        toast.success("Receipt scanned — review and save", { id: t });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't scan that receipt", { id: t });
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track every dollar that leaves your business.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onScan} />
          <Button
            variant="outline"
            onClick={autoCategorize}
            disabled={categorizing}
            className="gap-1.5"
          >
            {categorizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 text-primary" />
            )}
            AI auto-categorize
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="gap-1.5"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
            Scan receipt with AI
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-gradient-hero gap-1.5">
                <Plus className="h-4 w-4" /> New expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit expense" : "New expense"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
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
                      {vendors.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No vendors yet — add one under Purchases → Vendors
                        </div>
                      )}
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedVendor && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {/* Fix (Jennifer QA — New Expense: "TIN- Please include
                          a field for the supplier's TIN..." / "Address- is
                          also needed for BIR reporting"): pulled from the
                          vendor record so it doesn't need re-entry per expense. */}
                      <div>TIN: {selectedVendor.tax_id || "—"}</div>
                      <div>Address: {selectedVendor.address || "—"}</div>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Category (chart of accounts)</Label>
                  <Select
                    value={form.account_id}
                    onValueChange={(v) => setForm({ ...form, account_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No expense accounts found
                        </div>
                      )}
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Supplier's Invoice Reference Number</Label>
                  <Input
                    value={form.supplier_invoice_number}
                    onChange={(e) =>
                      setForm({ ...form, supplier_invoice_number: e.target.value })
                    }
                    placeholder="Needed for BIR reporting"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <CurrencySelect
                      value={form.currency}
                      onValueChange={(v) => setForm({ ...form, currency: v })}
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={form.expense_date}
                      onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-hero">
                  Save
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border rounded-xl">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No expenses yet. Click{" "}
            <span className="font-medium text-foreground">Scan receipt with AI</span> to add one in
            seconds.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((x) => (
                <TableRow key={x.id}>
                  <TableCell>{formatDate(x.expense_date, dateFormat)}</TableCell>
                  <TableCell className="font-medium">{x.vendor}</TableCell>
                  <TableCell>{x.category}</TableCell>
                  <TableCell className="text-right">{fmt(Number(x.amount), x.currency)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(x)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(x.id)}>
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
