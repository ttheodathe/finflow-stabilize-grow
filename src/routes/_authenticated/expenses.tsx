import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { Plus, Pencil, Trash2, Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { parseReceipt } from "@/lib/ai-receipts.functions";
import { categorizeExpenses } from "@/lib/ai-bookkeeper.functions";

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
};

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
  const [items, setItems] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    category: "",
    vendor: "",
    description: "",
    amount: "0",
    expense_date: new Date().toISOString().slice(0, 10),
    currency: "USD",
  });
  const runScan = useServerFn(parseReceipt);
  const runCategorize = useServerFn(categorizeExpenses);
  const [categorizing, setCategorizing] = useState(false);

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
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", { ascending: false });
    if (error) return toast.error(error.message);
    setItems(data as Expense[]);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      category: "",
      vendor: "",
      description: "",
      amount: "0",
      expense_date: new Date().toISOString().slice(0, 10),
      currency: "USD",
    });
    setOpen(true);
  }
  function openEdit(x: Expense) {
    setEditing(x);
    setForm({
      category: x.category ?? "",
      vendor: x.vendor ?? "",
      description: x.description ?? "",
      amount: String(x.amount),
      expense_date: x.expense_date,
      currency: x.currency,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload = { ...form, amount: Number(form.amount) || 0, user_id: u.user.id };
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
      setEditing(null);
      setForm({
        category: parsed.category ?? "",
        vendor: parsed.vendor ?? "",
        description: parsed.description ?? "",
        amount: parsed.amount != null ? String(parsed.amount) : "0",
        expense_date: parsed.expense_date ?? new Date().toISOString().slice(0, 10),
        currency: parsed.currency || "USD",
      });
      setOpen(true);
      toast.success("Receipt scanned — review and save", { id: t });
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
                  <Input
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Software, Travel"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                    <Input
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                      maxLength={3}
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
                  <TableCell>{x.expense_date}</TableCell>
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
