import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/payroll/payslips")({
  head: () => ({ meta: [{ title: "Payslips — Free Accounting" }] }),
  component: PayslipsPage,
});

type Payslip = {
  id: string;
  employee_id: string;
  gross_salary: number;
  taxable_income: number;
  paye: number;
  total_employee_deductions: number;
  net_pay: number;
  total_employer_contributions: number;
  total_employer_cost: number;
  currency: string;
  created_at: string;
  employees?: { first_name: string; last_name: string } | null;
  pay_runs?: { period_start: string; period_end: string; pay_date: string; status: string } | null;
};
type Employee = { id: string; first_name: string; last_name: string };
type Contribution = { name: string; employee_amount: number; employer_amount: number };

function fmt(n: number, c = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n || 0);
  } catch {
    return `${c} ${(n || 0).toFixed(2)}`;
  }
}

function PayslipsPage() {
  const companyId = useActiveCompanyId();
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<Payslip | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const [s, e] = await Promise.all([
      supabase
        .from("payslips")
        .select("*, employees(first_name,last_name), pay_runs(period_start,period_end,pay_date,status)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.from("employees").select("id,first_name,last_name").eq("company_id", companyId).order("first_name"),
    ]);
    if (s.error) toast.error(s.error.message);
    setSlips((s.data ?? []) as unknown as Payslip[]);
    setEmployees((e.data ?? []) as Employee[]);
    setLoading(false);
  }

  useEffect(() => {
    setSlips([]);
    load(); /* eslint-disable-next-line */
  }, [companyId]);

  const filtered = useMemo(
    () => slips.filter((s) => employeeFilter === "all" || s.employee_id === employeeFilter),
    [slips, employeeFilter],
  );

  async function openDetail(slip: Payslip) {
    setDetail(slip);
    const { data, error } = await supabase
      .from("payslip_contributions")
      .select("name,employee_amount,employer_amount")
      .eq("payslip_id", slip.id);
    if (error) toast.error(error.message);
    setContributions((data ?? []) as Contribution[]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payslips</h1>
        <p className="text-muted-foreground">Full history across every pay run.</p>
      </div>

      <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All employees</SelectItem>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="bg-card border rounded-xl">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No payslips yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Pay date</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>PAYE</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => openDetail(s)}>
                  <TableCell className="font-medium">
                    {s.employees ? `${s.employees.first_name} ${s.employees.last_name}` : "—"}
                  </TableCell>
                  <TableCell>{s.pay_runs?.pay_date ?? "—"}</TableCell>
                  <TableCell>{fmt(s.gross_salary, s.currency)}</TableCell>
                  <TableCell>{fmt(s.paye, s.currency)}</TableCell>
                  <TableCell>{fmt(s.total_employee_deductions, s.currency)}</TableCell>
                  <TableCell className="font-medium">{fmt(s.net_pay, s.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Payslip detail
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee</span>
                <span className="font-medium">{detail.employees ? `${detail.employees.first_name} ${detail.employees.last_name}` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period</span>
                <span>{detail.pay_runs?.period_start} → {detail.pay_runs?.period_end}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-muted-foreground">Gross salary</span>
                <span>{fmt(detail.gross_salary, detail.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PAYE</span>
                <span>-{fmt(detail.paye, detail.currency)}</span>
              </div>
              {contributions.map((c) => (
                <div key={c.name} className="flex justify-between">
                  <span className="text-muted-foreground">{c.name} (employee)</span>
                  <span>-{fmt(c.employee_amount, detail.currency)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Net pay</span>
                <span>{fmt(detail.net_pay, detail.currency)}</span>
              </div>
              <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Employer contributions</span>
                  <span>{fmt(detail.total_employer_contributions, detail.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total employer cost</span>
                  <span>{fmt(detail.total_employer_cost, detail.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
