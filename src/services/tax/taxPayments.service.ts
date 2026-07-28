import { supabase } from "@/integrations/supabase/client";
import { TaxServiceError, type TaxPayment } from "@/types/tax.types";

export async function listTaxPayments(returnId: string): Promise<TaxPayment[]> {
  const { data, error } = await supabase
    .from("tax_payments")
    .select("*")
    .eq("return_id", returnId)
    .order("paid_date", { ascending: false });

  if (error) throw new TaxServiceError("FETCH_TAX_PAYMENTS_FAILED", error.message);
  return (data ?? []) as TaxPayment[];
}

export interface RecordTaxPaymentInput {
  returnId: string;
  companyId: string;
  amount: number;
  currency?: string;
  paidDate: string;
  method: string;
  reference?: string | null;
  sourceAccountId?: string | null;
  notes?: string | null;
}

export async function recordTaxPayment(input: RecordTaxPaymentInput): Promise<TaxPayment> {
  const { data, error } = await supabase
    .from("tax_payments")
    .insert({
      return_id: input.returnId,
      company_id: input.companyId,
      amount: input.amount,
      currency: input.currency ?? "USD",
      paid_date: input.paidDate,
      method: input.method,
      reference: input.reference ?? null,
      source_account_id: input.sourceAccountId ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new TaxServiceError("RECORD_TAX_PAYMENT_FAILED", error.message);
  return data as TaxPayment;
}

export async function deleteTaxPayment(id: string): Promise<void> {
  const { error } = await supabase.from("tax_payments").delete().eq("id", id);
  if (error) throw new TaxServiceError("DELETE_TAX_PAYMENT_FAILED", error.message);
}
