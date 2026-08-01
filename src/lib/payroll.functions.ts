import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calculatePayroll, type TaxBracket, type StatutoryContribution } from "@/lib/payroll-calc";

// ---------------------------------------------------------------------------
// Pay run lifecycle: draft (payslips generated) -> approved (locked) ->
// paid (posts one consolidated journal entry, not one per employee, so the
// ledger stays readable). Payroll amounts are always computed server-side
// from payroll_tax_brackets/payroll_statutory_contributions at generation
// time — never trusted from the client — same principle as the document
// extraction/approval pipeline.
// ---------------------------------------------------------------------------

const GenerateInput = z.object({
  companyId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  payDate: z.string(),
  employeeIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional().nullable(),
});

export const generatePayRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, salary, salary_currency, employment_type, employment_status")
      .eq("company_id", data.companyId)
      .in("id", data.employeeIds);
    if (empErr) throw new Error(empErr.message);
    if (!employees || employees.length === 0) throw new Error("No matching employees found");

    const terminated = employees.filter((e) => e.employment_status === "terminated");
    if (terminated.length > 0) {
      throw new Error(`${terminated.length} selected employee(s) are terminated and can't be paid`);
    }

    // Brackets/contributions effective as of the pay date, so a pay run
    // always reflects the rates that actually applied on that date even
    // if config changes later.
    const [bracketsRes, statutoryRes] = await Promise.all([
      supabase
        .from("payroll_tax_brackets")
        .select("min_income,max_income,rate,employee_category")
        .eq("company_id", data.companyId)
        .lte("effective_from", data.payDate)
        .or(`effective_to.is.null,effective_to.gt.${data.payDate}`),
      supabase
        .from("payroll_statutory_contributions")
        .select("name,employee_rate,employer_rate,is_active,affects_paye_base")
        .eq("company_id", data.companyId)
        .lte("effective_from", data.payDate)
        .or(`effective_to.is.null,effective_to.gt.${data.payDate}`),
    ]);
    if (bracketsRes.error) throw new Error(bracketsRes.error.message);
    if (statutoryRes.error) throw new Error(statutoryRes.error.message);
    const allBrackets = (bracketsRes.data ?? []) as (TaxBracket & { employee_category: string })[];
    const statutory = (statutoryRes.data ?? []) as StatutoryContribution[];
    if (allBrackets.length === 0) {
      throw new Error("No payroll tax brackets configured for this company. Set them up in Payroll Settings first.");
    }

    const { data: payRun, error: runErr } = await supabase
      .from("pay_runs")
      .insert({
        company_id: data.companyId,
        period_start: data.periodStart,
        period_end: data.periodEnd,
        pay_date: data.payDate,
        status: "draft",
        notes: data.notes || null,
        created_by: auth.user.id,
        currency: employees[0]?.salary_currency ?? "USD",
      } as never)
      .select("id")
      .single();
    if (runErr || !payRun) throw new Error(runErr?.message ?? "Failed to create pay run");
    const payRunId = (payRun as { id: string }).id;

    let totalGross = 0;
    let totalEmployeeDeductions = 0;
    let totalNet = 0;
    let totalEmployerContributions = 0;
    let totalEmployerCost = 0;

    for (const emp of employees) {
      const category = emp.employment_type === "contract" ? "secondary_employer" : "permanent";
      const brackets = allBrackets.filter((b) => b.employee_category === category);
      const result = calculatePayroll(Number(emp.salary), brackets, statutory);

      const { data: payslip, error: slipErr } = await supabase
        .from("payslips")
        .insert({
          company_id: data.companyId,
          pay_run_id: payRunId,
          employee_id: emp.id,
          gross_salary: result.grossSalary,
          taxable_income: result.taxableIncome,
          paye: result.paye,
          total_employee_deductions: result.totalEmployeeDeductions,
          net_pay: result.netPay,
          total_employer_contributions: result.totalEmployerContributions,
          total_employer_cost: result.totalEmployerCost,
          currency: emp.salary_currency,
        } as never)
        .select("id")
        .single();
      if (slipErr || !payslip) throw new Error(slipErr?.message ?? "Failed to create payslip");

      if (result.contributions.length > 0) {
        await supabase.from("payslip_contributions").insert(
          result.contributions.map((c) => ({
            payslip_id: (payslip as { id: string }).id,
            name: c.name,
            employee_amount: c.employeeAmount,
            employer_amount: c.employerAmount,
          })) as never,
        );
      }

      totalGross += result.grossSalary;
      totalEmployeeDeductions += result.totalEmployeeDeductions;
      totalNet += result.netPay;
      totalEmployerContributions += result.totalEmployerContributions;
      totalEmployerCost += result.totalEmployerCost;
    }

    await supabase
      .from("pay_runs")
      .update({
        total_gross: round2(totalGross),
        total_employee_deductions: round2(totalEmployeeDeductions),
        total_net: round2(totalNet),
        total_employer_contributions: round2(totalEmployerContributions),
        total_employer_cost: round2(totalEmployerCost),
      })
      .eq("id", payRunId);

    return { ok: true as const, payRunId, employeeCount: employees.length };
  });

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const ApproveInput = z.object({ payRunId: z.string().uuid() });

export const approvePayRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ApproveInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: run, error } = await supabase
      .from("pay_runs")
      .select("id, status")
      .eq("id", data.payRunId)
      .single();
    if (error || !run) throw new Error("Pay run not found");
    if (run.status !== "draft") throw new Error("Only draft pay runs can be approved");

    await supabase
      .from("pay_runs")
      .update({ status: "approved", approved_by: auth.user.id, approved_at: new Date().toISOString() })
      .eq("id", data.payRunId);

    return { ok: true as const };
  });

const PostInput = z.object({
  payRunId: z.string().uuid(),
  salaryExpenseAccountId: z.string().uuid(),
  employerTaxExpenseAccountId: z.string().uuid(),
  statutoryPayableAccountId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
});

// Posts ONE consolidated journal entry for the whole pay run (not one per
// employee — that would make the ledger unreadable for anything but a
// tiny team). Standard payroll journal structure:
//   Dr Salary Expense              = total gross
//   Dr Employer Tax Expense        = total employer contributions
//   Cr Statutory Payable           = PAYE + employee contributions + employer contributions
//   Cr Bank (net pay disbursed)    = total net
// This balances by construction: gross + employer_contrib
//   = (paye + employee_contrib + employer_contrib) + net_pay
//   since net_pay = gross - paye - employee_contrib.
export const postPayRunToLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: run, error: runErr } = await supabase
      .from("pay_runs")
      .select("*")
      .eq("id", data.payRunId)
      .single();
    if (runErr || !run) throw new Error("Pay run not found");
    if (run.status !== "approved") throw new Error("Only approved pay runs can be posted/paid");

    const totalGross = Number(run.total_gross);
    const totalEmployerContrib = Number(run.total_employer_contributions);
    const totalStatutoryLiability = Number(run.total_employee_deductions) + totalEmployerContrib;
    const totalNet = Number(run.total_net);

    const { data: entry, error: entryErr } = await supabase
      .from("journal_entries" as any)
      .insert({
        company_id: run.company_id,
        user_id: auth.user.id,
        entry_date: run.pay_date,
        reference: `PAYRUN-${run.id.slice(0, 8)}`,
        memo: `Payroll for ${run.period_start} to ${run.period_end}`,
        source_type: "payroll",
      })
      .select("id")
      .single();
    if (entryErr || !entry) throw new Error(entryErr?.message ?? "Failed to create journal entry");
    const entryId = (entry as unknown as { id: string }).id;

    const lines = [
      { account_id: data.salaryExpenseAccountId, debit: totalGross, credit: 0, description: "Payroll: gross wages" },
      { account_id: data.employerTaxExpenseAccountId, debit: totalEmployerContrib, credit: 0, description: "Payroll: employer statutory contributions" },
      { account_id: data.statutoryPayableAccountId, debit: 0, credit: totalStatutoryLiability, description: "Payroll: PAYE + statutory contributions payable" },
      { account_id: data.bankAccountId, debit: 0, credit: totalNet, description: "Payroll: net pay disbursed" },
    ].filter((l) => l.debit > 0 || l.credit > 0);

    const { error: linesErr } = await supabase.from("journal_lines" as any).insert(
      lines.map((l) => ({
        company_id: run.company_id,
        user_id: auth.user!.id,
        entry_id: entryId,
        ...l,
      })),
    );
    if (linesErr) throw new Error(linesErr.message);

    await supabase
      .from("pay_runs")
      .update({ status: "paid", paid_at: new Date().toISOString(), journal_entry_id: entryId })
      .eq("id", data.payRunId);

    await supabase.from("audit_logs").insert({
      company_id: run.company_id,
      user_id: auth.user.id,
      action: "pay_run_posted",
      entity_type: "pay_runs",
      entity_id: run.id,
      metadata: { journal_entry_id: entryId, total_net: totalNet, total_gross: totalGross },
    });

    return { ok: true as const, journalEntryId: entryId };
  });

const CancelInput = z.object({ payRunId: z.string().uuid() });

export const cancelPayRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: run, error } = await supabase
      .from("pay_runs")
      .select("id, status")
      .eq("id", data.payRunId)
      .single();
    if (error || !run) throw new Error("Pay run not found");
    if (run.status === "paid") throw new Error("Can't cancel a pay run that's already been paid — it's posted to the ledger");
    await supabase.from("pay_runs").update({ status: "cancelled" }).eq("id", data.payRunId);
    return { ok: true as const };
  });
