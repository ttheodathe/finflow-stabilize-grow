import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Wallet, Loader2, CheckCircle2, Landmark, Eye } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { generatePayRun, approvePayRun, postPayRunToLedger, cancelPayRun } from "@/lib/payroll.functions";

export const Route = createFileRoute("/_authenticated/payroll/pay-runs")({
  head: () => ({ meta: [{ title: "Pay Runs — Finflow Track" }] }),
  component: PayRuns,
});

type PayRun = {
  id: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
  currency: string;
  total_gross: number;
  total_employee_deductions: number;
  total_net: number;
  total_employer_contributions: number;
  total_employer_cost: number;
};
type Employee = { id: string; first_name: string; last_name: string; salary: number; salary_currency: string; employment_status: string };
type AdjLine = { label: string; amount: number };
type Account = { id: string; code: string; name: string; type: string };
type Payslip = {
  id: string;
  employee_id: string;
  gross_salary: number;
  paye: number;
  total_employee_deductions: number;
  net_pay: number;
  total_employer_contributions: number;
  employees?: { first_name: string; last_name: string } | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  approved: "outline",
  paid: "default",
  cancelled: "destructive",
};

function fmt(n: number, c = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
  } catch {
    return `${c} ${(n || 0).toFixed(2)}`;
  }
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function lastOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function PayRuns() {
  const companyId = useActiveCompanyId();
  const [runs, setRuns] = useState<PayRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const runGenerate = useServerFn(generatePayRun);
  const runApprove = useServerFn(approvePayRun);
  const runPost = useServerFn(postPayRunToLedger);
  const runCancel = useServerFn(cancelPayRun);

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    period_start: firstOfMonth(),
    period_end: lastOfMonth(),
    pay_date: lastOfMonth(),
    notes: "",
  });
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [adjustments, setAdjustments] = useState<Record<string, { additions: AdjLine[]; deductions: AdjLine[] }>>({});
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [adjDraft, setAdjDraft] = useState({ kind: "addition" as "addition" | "deduction", label: "", amount: "" });
  const [unpaidLeaveDays, setUnpaidLeaveDays] = useState<Record<string, number>>({});

  const [payOpen, setPayOpen] = useState<PayRun | null>(null);
  const [payAccounts, setPayAccounts] = useState({
    salaryExpenseAccountId: "",
    employerTaxExpenseAccountId: "",
    statutoryPayableAccountId: "",
    bankAccountId: "",
  });

  const [viewOpen, setViewOpen] = useState<PayRun | null>(null);
  const [viewSlips, setViewSlips] = useState<Payslip[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const [r, e, a] = await Promise.all([
      supabase.from("pay_runs").select("*").eq("company_id", companyId).order("pay_date", { ascending: false }),
      supabase
        .from("employees")
        .select("id,first_name,last_name,salary,salary_currency,employment_status")
        .eq("company_id", companyId)
        .eq("employment_status", "active")
        .order("first_name"),
      supabase.from("accounts").select("id,code,name,type").eq("company_id", companyId).eq("is_active", true).order("code"),
    ]);
    if (r.error) toast.error(r.error.message);
    setRuns((r.data ?? []) as PayRun[]);
    setEmployees((e.data ?? []) as Employee[]);
    setAccounts((a.data ?? []) as Account[]);
    setLoading(false);
  }

  useEffect(() => {
    setRuns([]);
    load(); /* eslint-disable-next-line */
  }, [companyId]);

  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "expense"), [accounts]);
  const liabilityAccounts = useMemo(() => accounts.filter((a) => a.type === "liability"), [accounts]);
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type === "asset"), [accounts]);

  function openNew() {
    setNewForm({ period_start: firstOfMonth(), period_end: lastOfMonth(), pay_date: lastOfMonth(), notes: "" });
    setSelectedEmployees(new Set(employees.map((e) => e.id)));
    setAdjustments({});
    setExpandedEmployee(null);
    setNewOpen(true);
    loadUnpaidLeave(firstOfMonth(), lastOfMonth());
  }

  // Approved leave from an unpaid leave type that overlaps the pay period —
  // shown as information so whoever's running payroll can decide on a
  // deduction manually via the adjustments below. Deliberately not
  // auto-computing a deduction amount: that needs a "working days"
  // definition (weekends? holidays?) that doesn't exist yet, and a wrong
  // automatic number on a paycheck is worse than a missing one.
  async function loadUnpaidLeave(start: string, end: string) {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("leave_requests")
      .select("employee_id, days_requested, leave_types!inner(is_paid)")
      .eq("company_id", companyId)
      .eq("status", "approved")
      .eq("leave_types.is_paid", false)
      .lte("start_date", end)
      .gte("end_date", start);
    if (error) return; // non-critical, just skip the hint
    const totals: Record<string, number> = {};
    for (const row of (data ?? []) as any[]) {
      totals[row.employee_id] = (totals[row.employee_id] ?? 0) + Number(row.days_requested);
    }
    setUnpaidLeaveDays(totals);
  }

  function addAdjustment() {
    if (!expandedEmployee) return;
    if (!adjDraft.label.trim()) return toast.error("Enter a label");
    const amount = Number(adjDraft.amount);
    if (!amount || amount <= 0) return toast.error("Enter a positive amount");
    setAdjustments((prev) => {
      const current = prev[expandedEmployee] ?? { additions: [], deductions: [] };
      const key = adjDraft.kind === "addition" ? "additions" : "deductions";
      return {
        ...prev,
        [expandedEmployee]: { ...current, [key]: [...current[key], { label: adjDraft.label.trim(), amount }] },
      };
    });
    setAdjDraft({ kind: "addition", label: "", amount: "" });
  }

  function removeAdjustment(employeeId: string, kind: "additions" | "deductions", index: number) {
    setAdjustments((prev) => {
      const current = prev[employeeId];
      if (!current) return prev;
      return { ...prev, [employeeId]: { ...current, [kind]: current[kind].filter((_, i) => i !== index) } };
    });
  }

  function toggleEmployee(id: string) {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return toast.error("Select a company first");
    if (selectedEmployees.size === 0) return toast.error("Select at least one employee");
    setBusy(true);
    try {
      const res = await runGenerate({
        data: {
          companyId,
          periodStart: newForm.period_start,
          periodEnd: newForm.period_end,
          payDate: newForm.pay_date,
          employeeIds: Array.from(selectedEmployees),
          notes: newForm.notes || null,
          adjustments,
        },
      });
      toast.success(`Pay run created — ${res.employeeCount} payslip${res.employeeCount > 1 ? "s" : ""} generated`);
      setNewOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate pay run");
    } finally {
      setBusy(false);
    }
  }

  async function approve(run: PayRun) {
    setBusy(true);
    try {
      await runApprove({ data: { payRunId: run.id } });
      toast.success("Pay run approved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  function openPay(run: PayRun) {
    setPayAccounts({
      salaryExpenseAccountId: expenseAccounts.find((a) => /salary|wage|payroll/i.test(a.name))?.id ?? expenseAccounts[0]?.id ?? "",
      employerTaxExpenseAccountId: expenseAccounts.find((a) => /tax|statutory|rssb/i.test(a.name))?.id ?? expenseAccounts[0]?.id ?? "",
      statutoryPayableAccountId: liabilityAccounts.find((a) => /tax|payable|rssb|statutory/i.test(a.name))?.id ?? liabilityAccounts[0]?.id ?? "",
      bankAccountId: assetAccounts.find((a) => /bank|cash/i.test(a.name))?.id ?? assetAccounts[0]?.id ?? "",
    });
    setPayOpen(run);
  }

  async function submitPay(e: React.FormEvent) {
    e.preventDefault();
    if (!payOpen) return;
    const { salaryExpenseAccountId, employerTaxExpenseAccountId, statutoryPayableAccountId, bankAccountId } = payAccounts;
    if (!salaryExpenseAccountId || !employerTaxExpenseAccountId || !statutoryPayableAccountId || !bankAccountId) {
      return toast.error("Select all four accounts");
    }
    setBusy(true);
    try {
      await runPost({ data: { payRunId: payOpen.id, ...payAccounts } });
      toast.success("Pay run posted — journal entry created and marked paid");
      setPayOpen(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post pay run");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(run: PayRun) {
    if (!confirm("Cancel this pay run?")) return;
    setBusy(true);
    try {
      await runCancel({ data: { payRunId: run.id } });
      toast.success("Pay run cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  }

  async function openView(run: PayRun) {
    setViewOpen(run);
    setViewLoading(true);
    const { data, error } = await supabase
      .from("payslips")
      .select("*, employees(first_name,last_name)")
      .eq("pay_run_id", run.id)
      .order("net_pay", { ascending: false });
    if (error) toast.error(error.message);
    setViewSlips((data ?? []) as unknown as Payslip[]);
    setViewLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pay Runs</h1>
          <p className="text-muted-foreground">Generate, approve, and post payroll for your team.</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-gradient-hero">
              <Plus className="h-4 w-4" /> New pay run
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New pay run</DialogTitle></DialogHeader>
            <form onSubmit={submitNew} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Period start</Label>
                  <Input type="date" value={newForm.period_start} onChange={(e) => { const v = e.target.value; setNewForm({ ...newForm, period_start: v }); loadUnpaidLeave(v, newForm.period_end); }} required />
                </div>
                <div>
                  <Label>Period end</Label>
                  <Input type="date" value={newForm.period_end} onChange={(e) => { const v = e.target.value; setNewForm({ ...newForm, period_end: v }); loadUnpaidLeave(newForm.period_start, v); }} required />
                </div>
                <div>
                  <Label>Pay date</Label>
                  <Input type="date" value={newForm.pay_date} onChange={(e) => setNewForm({ ...newForm, pay_date: e.target.value })} required />
                </div>
              </div>
              <div>
                <Label>Employees ({selectedEmployees.size} of {employees.length} selected)</Label>
                <div className="border rounded-md max-h-72 overflow-y-auto divide-y">
                  {employees.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No active employees found.</p>
                  ) : (
                    employees.map((emp) => {
                      const adj = adjustments[emp.id];
                      const addTotal = adj?.additions.reduce((s, a) => s + a.amount, 0) ?? 0;
                      const dedTotal = adj?.deductions.reduce((s, d) => s + d.amount, 0) ?? 0;
                      const unpaidDays = unpaidLeaveDays[emp.id];
                      const isExpanded = expandedEmployee === emp.id;
                      return (
                        <div key={emp.id} className="text-sm">
                          <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <Checkbox checked={selectedEmployees.has(emp.id)} onCheckedChange={() => toggleEmployee(emp.id)} />
                              {emp.first_name} {emp.last_name}
                              {unpaidDays ? (
                                <Badge variant="secondary" className="text-[10px]">{unpaidDays} unpaid leave day{unpaidDays > 1 ? "s" : ""}</Badge>
                              ) : null}
                            </label>
                            <span className="text-muted-foreground">
                              {fmt(emp.salary + addTotal - dedTotal, emp.salary_currency)}
                              {(addTotal > 0 || dedTotal > 0) && (
                                <span className="text-[10px] ml-1">(base {fmt(emp.salary, emp.salary_currency)})</span>
                              )}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedEmployee(isExpanded ? null : emp.id)}
                            >
                              {isExpanded ? "Close" : "Adjust"}
                            </Button>
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-2 bg-muted/30">
                              {[...(adj?.additions ?? []).map((a, i) => ({ ...a, kind: "additions" as const, i })),
                                ...(adj?.deductions ?? []).map((d, i) => ({ ...d, kind: "deductions" as const, i }))]
                                .map((line) => (
                                  <div key={`${line.kind}-${line.i}`} className="flex items-center justify-between text-xs">
                                    <span>{line.kind === "additions" ? "+ " : "− "}{line.label}: {fmt(line.amount, emp.salary_currency)}</span>
                                    <Button type="button" variant="ghost" size="sm" className="h-5 px-1" onClick={() => removeAdjustment(emp.id, line.kind, line.i)}>
                                      Remove
                                    </Button>
                                  </div>
                                ))}
                              <div className="flex items-center gap-1.5">
                                <Select value={adjDraft.kind} onValueChange={(v: "addition" | "deduction") => setAdjDraft({ ...adjDraft, kind: v })}>
                                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="addition">Bonus (+)</SelectItem>
                                    <SelectItem value="deduction">Deduction (−)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  placeholder="Label"
                                  className="h-8 text-xs"
                                  value={adjDraft.label}
                                  onChange={(e) => setAdjDraft({ ...adjDraft, label: e.target.value })}
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Amount"
                                  className="h-8 text-xs w-28"
                                  value={adjDraft.amount}
                                  onChange={(e) => setAdjDraft({ ...adjDraft, amount: e.target.value })}
                                />
                                <Button type="button" size="sm" className="h-8" onClick={addAdjustment}>Add</Button>
                              </div>
                              {unpaidDays ? (
                                <p className="text-[11px] text-muted-foreground">
                                  {unpaidDays} unpaid leave day{unpaidDays > 1 ? "s" : ""} in this period — add a deduction above if it should reduce this payslip.
                                </p>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={newForm.notes} onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })} rows={2} />
              </div>
              <Button type="submit" className="w-full bg-gradient-hero" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Generate pay run
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No pay runs yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Pay date</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{r.period_start} → {r.period_end}</TableCell>
                  <TableCell>{r.pay_date}</TableCell>
                  <TableCell>{fmt(r.total_gross, r.currency)}</TableCell>
                  <TableCell>{fmt(r.total_employee_deductions, r.currency)}</TableCell>
                  <TableCell className="font-medium">{fmt(r.total_net, r.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"} className="capitalize">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openView(r)} title="View payslips">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {r.status === "draft" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => approve(r)} disabled={busy}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => cancel(r)} disabled={busy}>Cancel</Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openPay(r)} disabled={busy}>
                          <Landmark className="h-4 w-4 mr-1" /> Mark as paid
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => cancel(r)} disabled={busy}>Cancel</Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Mark as paid — select posting accounts */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Post pay run to ledger</DialogTitle></DialogHeader>
          {payOpen && (
            <form onSubmit={submitPay} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This creates one consolidated journal entry for the full run ({fmt(payOpen.total_net, payOpen.currency)} net)
                and marks it paid. This can't be undone.
              </p>
              <div>
                <Label>Salary expense account</Label>
                <Select value={payAccounts.salaryExpenseAccountId} onValueChange={(v) => setPayAccounts({ ...payAccounts, salaryExpenseAccountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Employer statutory tax expense account</Label>
                <Select value={payAccounts.employerTaxExpenseAccountId} onValueChange={(v) => setPayAccounts({ ...payAccounts, employerTaxExpenseAccountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statutory payable account (PAYE + RSSB)</Label>
                <Select value={payAccounts.statutoryPayableAccountId} onValueChange={(v) => setPayAccounts({ ...payAccounts, statutoryPayableAccountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {liabilityAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bank account (net pay disbursed from)</Label>
                <Select value={payAccounts.bankAccountId} onValueChange={(v) => setPayAccounts({ ...payAccounts, bankAccountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-gradient-hero" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Post & mark paid
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View payslips for a run */}
      <Dialog open={!!viewOpen} onOpenChange={(o) => !o && setViewOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslips — {viewOpen?.period_start} to {viewOpen?.period_end}</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>PAYE</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewSlips.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.employees ? `${s.employees.first_name} ${s.employees.last_name}` : "—"}</TableCell>
                    <TableCell>{fmt(s.gross_salary, viewOpen?.currency)}</TableCell>
                    <TableCell>{fmt(s.paye, viewOpen?.currency)}</TableCell>
                    <TableCell>{fmt(s.total_employee_deductions, viewOpen?.currency)}</TableCell>
                    <TableCell className="font-medium">{fmt(s.net_pay, viewOpen?.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
