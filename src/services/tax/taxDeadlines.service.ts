import { supabase } from "@/integrations/supabase/client";
import { TaxServiceError, type TaxDeadline } from "@/types/tax.types";

export async function listTaxDeadlines(companyId: string): Promise<TaxDeadline[]> {
  const { data, error } = await supabase
    .from("tax_deadlines")
    .select("*")
    .eq("company_id", companyId)
    .order("due_date", { ascending: true });

  if (error) throw new TaxServiceError("FETCH_TAX_DEADLINES_FAILED", error.message);
  return computeStatuses((data ?? []) as TaxDeadline[]);
}

export async function upcomingTaxDeadline(companyId: string): Promise<TaxDeadline | null> {
  const deadlines = await listTaxDeadlines(companyId);
  const upcoming = deadlines
    .filter((d) => d.status !== "completed")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return upcoming[0] ?? null;
}

export interface CreateTaxDeadlineInput {
  companyId: string;
  taxSettingId?: string | null;
  title: string;
  taxType: string;
  dueDate: string;
  reminderDaysBefore?: number;
  isRecurring?: boolean;
}

export async function createTaxDeadline(input: CreateTaxDeadlineInput): Promise<TaxDeadline> {
  const { data, error } = await supabase
    .from("tax_deadlines")
    .insert({
      company_id: input.companyId,
      tax_setting_id: input.taxSettingId ?? null,
      title: input.title,
      tax_type: input.taxType,
      due_date: input.dueDate,
      reminder_days_before: input.reminderDaysBefore ?? 7,
      is_recurring: input.isRecurring ?? true,
    })
    .select("*")
    .single();

  if (error) throw new TaxServiceError("CREATE_TAX_DEADLINE_FAILED", error.message);
  return data as TaxDeadline;
}

export async function markTaxDeadlineComplete(
  id: string,
  taxReturnId?: string,
): Promise<TaxDeadline> {
  const { data, error } = await supabase
    .from("tax_deadlines")
    .update({ status: "completed", tax_return_id: taxReturnId ?? null })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new TaxServiceError("COMPLETE_TAX_DEADLINE_FAILED", error.message);
  return data as TaxDeadline;
}

export async function deleteTaxDeadline(id: string): Promise<void> {
  const { error } = await supabase.from("tax_deadlines").delete().eq("id", id);
  if (error) throw new TaxServiceError("DELETE_TAX_DEADLINE_FAILED", error.message);
}

/** Derives due_soon/overdue client-side from due_date, since status in the
 *  DB is otherwise only updated by explicit user action (completed) or a
 *  future scheduled job. Keeps the UI accurate between those events. */
function computeStatuses(deadlines: TaxDeadline[]): TaxDeadline[] {
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;

  return deadlines.map((d) => {
    if (d.status === "completed") return d;
    const dueTime = new Date(d.due_date).getTime();
    const daysUntil = (dueTime - now) / DAY;

    if (daysUntil < 0) return { ...d, status: "overdue" };
    if (daysUntil <= d.reminder_days_before) return { ...d, status: "due_soon" };
    return { ...d, status: "upcoming" };
  });
}
