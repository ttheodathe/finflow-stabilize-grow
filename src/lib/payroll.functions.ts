import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calculatePayroll, type TaxBracket, type StatutoryContribution } from "@/lib/payroll-calc";
import { assertFeature } from "@/lib/features/plan-guard";

// ---------------------------------------------------------------------------
// Pay run lifecycle: draft (payslips generated) -> approved (locked) ->
// paid (posts one consolidated journal entry, not one per employee, so the
// ledger stays readable). Payroll amounts are always computed server-side
// from payroll_tax_brackets/payroll_statutory_contributions at generation
// time — never trusted from the client — same principle as the document
// extraction/approval pipeline.
// ---------------------------------------------------------------------------

const AdjustmentLine = z.object({ label: z.string().trim().min(1).max(120), amount: z.number().finite().positive() });

const GenerateInput = z.object({
  companyId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  payDate: z.string(),
  employeeIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional().nullable(),
  // Keyed by employee id. Additions (bonuses/allowances) are taxable and
  // added to gross before PAYE/statutory are computed. Deductions (loan
  // repayments etc.) are post-tax and subtracted from net pay directly.
  adjustments: z
    .record(z.object({ additions: z.array(AdjustmentLine).max(20).default([]), deductions: z.array(AdjustmentLine).max(20).default([]) }))
    .optional()
    .default({}),
});

export const generatePayRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");
    await assertFeature(supabase, { userId: context.userId, companyId: data.companyId }, "payroll");

    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, salary, salary_currency, employment_type, employment_status")
      .eq("company_id", data.companyId)
      .in("id", data.employeeIds);
    if (empErr) throw new Error(empErr.message);
    if (!employees || employees.length === 0) throw new Error("No matching employees found");

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .select("currency")
      .eq("id", data.companyId)
      .single();
    if (companyErr || !company) throw new Error(companyErr?.message ?? "Company not found");
    if (employees.some((employee) => employee.salary_currency !== company.currency)) {
      throw new Error("Payroll currently requires every employee salary to use the company's base currency.");
    }

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

    if (new Set(data.employeeIds).size !== data.employeeIds.length) {
      throw new Error("Duplicate employees are not allowed in a pay run.");
    }
    if (employees.length !== data.employeeIds.length) {
      throw new Error("One or more selected employees are unavailable in this company.");
    }

    const payslipPayload: Array<Record<string, unknown>> = [];

    for (const emp of employees) {
      const category = emp.employment_type === "contract" ? "secondary_employer" : "permanent";
      const brackets = allBrackets.filter((b) => b.employee_category === category);
      if (brackets.length === 0) {
        throw new Error(`No effective payroll tax brackets are configured for ${category} employees.`);
      }

      const empAdjustments = data.adjustments[emp.id] ?? { additions: [], deductions: [] };
      const additionsTotal = empAdjustments.additions.reduce((s, a) => s + a.amount, 0);
      const deductionsTotal = empAdjustments.deductions.reduce((s, d) => s + d.amount, 0);
      const effectiveGross = Number(emp.salary) + additionsTotal;

      const result = calculatePayroll(effectiveGross, brackets, statutory);
      const finalNetPay = round2(result.netPay - deductionsTotal);
      if (finalNetPay < 0) {
        throw new Error("Employee deductions cannot exceed calculated net pay.");
      }

      payslipPayload.push({
        employee_id: emp.id,
        base_salary: Number(emp.salary),
        gross_salary: result.grossSalary,
        taxable_income: result.taxableIncome,
        paye: result.paye,
        total_employee_deductions: round2(result.totalEmployeeDeductions + deductionsTotal),
        net_pay: finalNetPay,
        total_employer_contributions: result.totalEmployerContributions,
        total_employer_cost: round2(result.totalEmployerCost),
        currency: emp.salary_currency,
        contributions: result.contributions.map((c) => ({
          name: c.name,
          employee_amount: c.employeeAmount,
          employer_amount: c.employerAmount,
        })),
        line_items: [
          ...empAdjustments.additions.map((a) => ({
            kind: "addition",
            label: a.label,
            amount: a.amount,
          })),
          ...empAdjustments.deductions.map((d) => ({
            kind: "deduction",
            label: d.label,
            amount: d.amount,
          })),
        ],
      });
    }

    // One server-only RPC writes the pay run, payslips, contributions and
    // adjustment lines in a single PostgreSQL transaction.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payRunId, error: generationError } = await (supabaseAdmin as any).rpc(
      "create_pay_run_atomic",
      {
        p_company_id: data.companyId,
        p_user_id: auth.user.id,
        p_period_start: data.periodStart,
        p_period_end: data.periodEnd,
        p_pay_date: data.payDate,
        p_notes: data.notes || null,
        p_currency: company.currency,
        p_payslips: payslipPayload,
      },
    );

    if (generationError || !payRunId) {
      throw new Error(generationError?.message ?? "Failed to generate payroll atomically.");
    }

    return { ok: true as const, payRunId: payRunId as string, employeeCount: employees.length };
  });

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const ApproveInput = z.object({ payRunId: z.string().uuid() });

export const approvePayRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ApproveInput.parse(d))
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

    const { data: approved, error: approveErr } = await supabase
      .from("pay_runs")
      .update({ status: "approved", approved_by: auth.user.id, approved_at: new Date().toISOString() })
      .eq("id", data.payRunId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (approveErr || !approved) throw new Error(approveErr?.message ?? "Pay run state changed before approval.");

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
  .validator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not authenticated");

    const { data: journalEntryId, error } = await (supabase as any).rpc("post_payrun_to_ledger", {
      p_pay_run_id: data.payRunId,
      p_salary_expense_account_id: data.salaryExpenseAccountId,
      p_employer_tax_expense_account_id: data.employerTaxExpenseAccountId,
      p_statutory_payable_account_id: data.statutoryPayableAccountId,
      p_bank_account_id: data.bankAccountId,
    });
    if (error || !journalEntryId) {
      throw new Error(error?.message ?? "Failed to post payroll to the ledger");
    }

    return { ok: true as const, journalEntryId };
  });

const CancelInput = z.object({ payRunId: z.string().uuid() });

export const cancelPayRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CancelInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: run, error } = await supabase
      .from("pay_runs")
      .select("id, status")
      .eq("id", data.payRunId)
      .single();
    if (error || !run) throw new Error("Pay run not found");
    if (run.status === "paid") throw new Error("Can't cancel a pay run that's already been paid — it's posted to the ledger");
    const { data: cancelled, error: cancelErr } = await supabase
      .from("pay_runs")
      .update({ status: "cancelled" })
      .eq("id", data.payRunId)
      .in("status", ["draft", "approved"])
      .select("id")
      .maybeSingle();
    if (cancelErr || !cancelled) throw new Error(cancelErr?.message ?? "Pay run state changed before cancellation.");
    return { ok: true as const };
  });
