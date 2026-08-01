import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { calculatePayroll, type TaxBracket, type StatutoryContribution } from "@/lib/payroll-calc";

export const Route = createFileRoute("/_authenticated/payroll/settings")({
  head: () => ({ meta: [{ title: "Payroll Settings — FinFlow Track" }] }),
  component: PayrollSettings,
});

type BracketRow = TaxBracket & { id: string; employee_category: string; effective_from: string; source_note: string | null };
type ContributionRow = StatutoryContribution & { id: string; effective_from: string; source_note: string | null };

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function PayrollSettings() {
  const companyId = useActiveCompanyId();
  const [brackets, setBrackets] = useState<BracketRow[]>([]);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [testSalary, setTestSalary] = useState("250000");

  async function load() {
    if (!companyId) return;
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [b, c] = await Promise.all([
      supabase
        .from("payroll_tax_brackets")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_category", "permanent")
        .lte("effective_from", today)
        .or(`effective_to.is.null,effective_to.gt.${today}`)
        .order("min_income"),
      supabase
        .from("payroll_statutory_contributions")
        .select("*")
        .eq("company_id", companyId)
        .lte("effective_from", today)
        .or(`effective_to.is.null,effective_to.gt.${today}`)
        .order("name"),
    ]);
    if (b.error) toast.error(b.error.message);
    if (c.error) toast.error(c.error.message);
    setBrackets((b.data ?? []) as unknown as BracketRow[]);
    setContributions((c.data ?? []) as unknown as ContributionRow[]);
    setLoading(false);
  }

  useEffect(() => {
    setBrackets([]);
    setContributions([]);
    load(); /* eslint-disable-next-line */
  }, [companyId]);

  async function toggleContribution(row: ContributionRow) {
    const { error } = await supabase
      .from("payroll_statutory_contributions")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  }

  const preview = useMemo(() => {
    const salary = Number(testSalary) || 0;
    if (brackets.length === 0) return null;
    return calculatePayroll(salary, brackets, contributions);
  }, [testSalary, brackets, contributions]);

  if (!loading && brackets.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Settings</h1>
          <p className="text-muted-foreground">Configure tax brackets and statutory contributions.</p>
        </div>
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No payroll tax rules configured for this company yet. These need to be set up per-jurisdiction —
          contact support or ask your accountant which rates apply to this company.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Settings</h1>
        <p className="text-muted-foreground">Tax brackets and statutory contributions used to calculate payslips.</p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Rates below are sourced from RRA's official PAYE schedule and RSSB's published contribution rates.
          RSSB pension is scheduled to increase further between 2027–2030 per RSSB's own announced roadmap —
          these will need a new dated bracket row when that happens, not an edit to the current one, so past
          payslips stay correct.
        </span>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Income tax brackets (PAYE) — permanent employees</h2>
        <div className="bg-card border rounded-xl">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Range</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective from</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brackets.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      {fmt(b.min_income)} – {b.max_income === null ? "∞" : fmt(b.max_income)}
                    </TableCell>
                    <TableCell>{(b.rate * 100).toFixed(0)}%</TableCell>
                    <TableCell>{b.effective_from}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">{b.source_note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Statutory contributions</h2>
        <div className="bg-card border rounded-xl">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map((c) => (
                  <TableRow key={c.id} className={c.is_active ? "" : "opacity-50"}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{(c.employee_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell>{(c.employer_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{((c.employee_rate + c.employer_rate) * 100).toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={c.is_active} onCheckedChange={() => toggleContribution(c)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs">{c.source_note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {!loading && preview && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Try it — payslip preview</h2>
          <div className="bg-card border rounded-xl p-5 space-y-4">
            <div className="max-w-xs">
              <Label>Gross monthly salary</Label>
              <Input type="number" value={testSalary} onChange={(e) => setTestSalary(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Gross salary</div>
                <div className="font-medium">{fmt(preview.grossSalary)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">PAYE</div>
                <div className="font-medium">{fmt(preview.paye)}</div>
              </div>
              {preview.contributions.map((c) => (
                <div key={c.name}>
                  <div className="text-muted-foreground">{c.name} (employee)</div>
                  <div className="font-medium">{fmt(c.employeeAmount)}</div>
                </div>
              ))}
              <div>
                <div className="text-muted-foreground">Total deductions</div>
                <div className="font-medium">{fmt(preview.totalEmployeeDeductions)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Net pay</div>
                <div className="font-semibold text-lg">{fmt(preview.netPay)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Employer contributions</div>
                <div className="font-medium">{fmt(preview.totalEmployerContributions)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total employer cost</div>
                <div className="font-medium">{fmt(preview.totalEmployerCost)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
