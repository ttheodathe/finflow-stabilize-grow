import { supabase } from "@/integrations/supabase/client";
import {
  TaxServiceError,
  type TaxReturn,
  type TaxReturnLine,
  type TaxSetting,
} from "@/types/tax.types";
import { splitAmountAndTax, calcNetTaxDue } from "@/lib/tax/taxCalculations";

export async function listTaxReturns(companyId: string): Promise<TaxReturn[]> {
  const { data, error } = await supabase
    .from("tax_returns")
    .select("*, tax_period:tax_periods(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw new TaxServiceError("FETCH_TAX_RETURNS_FAILED", error.message);
  return (data ?? []) as unknown as TaxReturn[];
}

export async function getTaxReturn(returnId: string): Promise<TaxReturn> {
  const { data, error } = await supabase
    .from("tax_returns")
    .select("*, tax_period:tax_periods(*)")
    .eq("id", returnId)
    .single();

  if (error) throw new TaxServiceError("FETCH_TAX_RETURN_FAILED", error.message);
  return data as unknown as TaxReturn;
}

export async function listTaxReturnLines(returnId: string): Promise<TaxReturnLine[]> {
  const { data, error } = await supabase
    .from("tax_return_lines")
    .select("*")
    .eq("return_id", returnId)
    .order("created_at", { ascending: true });

  if (error) throw new TaxServiceError("FETCH_TAX_RETURN_LINES_FAILED", error.message);
  return (data ?? []) as TaxReturnLine[];
}

/**
 * Creates (or reuses) the tax_period for the given range, then creates a
 * draft tax_return and computes its lines from invoices, bills, and
 * expenses in that period.
 *
 * NOTE on expenses: the `expenses` table has no tax breakdown column, so
 * input tax on expenses is estimated using the tax setting's own rate
 * (treated as inclusive of that rate). Bills and invoices carry their own
 * stored `tax` amount (rolled up from invoice_items/bill_items tax_rate)
 * and are used as-is — no estimation needed for those.
 */
export async function createReturnForPeriod(params: {
  companyId: string;
  taxSetting: TaxSetting;
  periodStart: string; // yyyy-mm-dd
  periodEnd: string; // yyyy-mm-dd
  dueDate: string; // yyyy-mm-dd
}): Promise<TaxReturn> {
  const { companyId, taxSetting, periodStart, periodEnd, dueDate } = params;

  // 1. find or create the tax_period
  const { data: existingPeriod } = await supabase
    .from("tax_periods")
    .select("*")
    .eq("tax_setting_id", taxSetting.id)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  let periodId = existingPeriod?.id as string | undefined;
  if (!periodId) {
    const { data: newPeriod, error: periodError } = await supabase
      .from("tax_periods")
      .insert({
        company_id: companyId,
        tax_setting_id: taxSetting.id,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate,
      })
      .select("*")
      .single();
    if (periodError) throw new TaxServiceError("CREATE_TAX_PERIOD_FAILED", periodError.message);
    periodId = newPeriod.id;
  }

  // 2. create the draft return
  const { data: taxReturn, error: returnError } = await supabase
    .from("tax_returns")
    .insert({ company_id: companyId, tax_period_id: periodId, tax_type: taxSetting.name })
    .select("*")
    .single();
  if (returnError) throw new TaxServiceError("CREATE_TAX_RETURN_FAILED", returnError.message);

  // 3. pull source ledger rows for the period
  const [
    { data: invoices, error: invError },
    { data: bills, error: billError },
    { data: expenses, error: expError },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, subtotal, tax, status, issue_date")
      .eq("company_id", companyId)
      .neq("status", "draft")
      .gte("issue_date", periodStart)
      .lte("issue_date", periodEnd),
    supabase
      .from("bills")
      .select("id, subtotal, tax, status, issue_date")
      .eq("company_id", companyId)
      .neq("status", "draft")
      .gte("issue_date", periodStart)
      .lte("issue_date", periodEnd),
    supabase
      .from("expenses")
      .select("id, amount, description, expense_date")
      .eq("company_id", companyId)
      .gte("expense_date", periodStart)
      .lte("expense_date", periodEnd),
  ]);

  if (invError) throw new TaxServiceError("FETCH_INVOICES_FAILED", invError.message);
  if (billError) throw new TaxServiceError("FETCH_BILLS_FAILED", billError.message);
  if (expError) throw new TaxServiceError("FETCH_EXPENSES_FAILED", expError.message);

  const lines: Array<Omit<TaxReturnLine, "id" | "created_at">> = [];

  for (const inv of invoices ?? []) {
    lines.push({
      return_id: taxReturn.id,
      company_id: companyId,
      source_type: "invoice",
      source_id: inv.id,
      account_id: null,
      description: `Invoice ${inv.id.slice(0, 8)}`,
      taxable_amount: inv.subtotal ?? 0,
      tax_amount: inv.tax ?? 0,
      direction: "output",
    });
  }

  for (const bill of bills ?? []) {
    lines.push({
      return_id: taxReturn.id,
      company_id: companyId,
      source_type: "bill",
      source_id: bill.id,
      account_id: null,
      description: `Bill ${bill.id.slice(0, 8)}`,
      taxable_amount: bill.subtotal ?? 0,
      tax_amount: bill.tax ?? 0,
      direction: "input",
    });
  }

  for (const exp of expenses ?? []) {
    const { taxable, tax } = splitAmountAndTax(
      exp.amount ?? 0,
      taxSetting.rate,
      taxSetting.is_inclusive,
    );
    lines.push({
      return_id: taxReturn.id,
      company_id: companyId,
      source_type: "expense",
      source_id: exp.id,
      account_id: null,
      description: exp.description ?? `Expense ${exp.id.slice(0, 8)}`,
      taxable_amount: taxable,
      tax_amount: tax,
      direction: "input",
    });
  }

  if (lines.length > 0) {
    const { error: linesError } = await supabase.from("tax_return_lines").insert(lines);
    if (linesError) throw new TaxServiceError("CREATE_TAX_RETURN_LINES_FAILED", linesError.message);
  }

  const taxableSales = round2(
    sum(lines.filter((l) => l.direction === "output").map((l) => l.taxable_amount)),
  );
  const outputTax = round2(
    sum(lines.filter((l) => l.direction === "output").map((l) => l.tax_amount)),
  );
  const taxablePurchases = round2(
    sum(lines.filter((l) => l.direction === "input").map((l) => l.taxable_amount)),
  );
  const inputTax = round2(
    sum(lines.filter((l) => l.direction === "input").map((l) => l.tax_amount)),
  );

  const { data: updatedReturn, error: updateError } = await supabase
    .from("tax_returns")
    .update({
      taxable_sales: taxableSales,
      taxable_purchases: taxablePurchases,
      output_tax: outputTax,
      input_tax: inputTax,
      net_tax_due: calcNetTaxDue(outputTax, inputTax),
    })
    .eq("id", taxReturn.id)
    .select("*")
    .single();
  if (updateError)
    throw new TaxServiceError("UPDATE_TAX_RETURN_TOTALS_FAILED", updateError.message);

  return updatedReturn as TaxReturn;
}

export async function submitTaxReturn(
  returnId: string,
  referenceNumber?: string,
): Promise<TaxReturn> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tax_returns")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by: user?.id ?? null,
      reference_number: referenceNumber ?? null,
    })
    .eq("id", returnId)
    .eq("status", "draft")
    .select("*")
    .single();

  if (error) throw new TaxServiceError("SUBMIT_TAX_RETURN_FAILED", error.message);
  return data as TaxReturn;
}

export async function updateTaxReturnStatus(
  returnId: string,
  status: TaxReturn["status"],
): Promise<TaxReturn> {
  const { data, error } = await supabase
    .from("tax_returns")
    .update({ status })
    .eq("id", returnId)
    .select("*")
    .single();

  if (error) throw new TaxServiceError("UPDATE_TAX_RETURN_STATUS_FAILED", error.message);
  return data as TaxReturn;
}

export async function deleteTaxReturn(returnId: string): Promise<void> {
  const { error } = await supabase
    .from("tax_returns")
    .delete()
    .eq("id", returnId)
    .eq("status", "draft");
  if (error) throw new TaxServiceError("DELETE_TAX_RETURN_FAILED", error.message);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
