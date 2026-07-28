import { supabase } from "@/integrations/supabase/client";
import { TaxServiceError, type TaxSetting } from "@/types/tax.types";

export async function listTaxSettings(companyId: string): Promise<TaxSetting[]> {
  const { data, error } = await supabase
    .from("company_tax_settings")
    .select("*")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new TaxServiceError("FETCH_TAX_SETTINGS_FAILED", error.message);
  return (data ?? []) as TaxSetting[];
}

export interface UpsertTaxSettingInput {
  id?: string;
  companyId: string;
  name: string;
  rate: number;
  isInclusive: boolean;
  isDefault: boolean;
  isActive: boolean;
  taxNumber?: string | null;
  jurisdiction?: string | null;
  authorityName?: string | null;
  filingFrequency: TaxSetting["filing_frequency"];
}

export async function upsertTaxSetting(input: UpsertTaxSettingInput): Promise<TaxSetting> {
  const payload = {
    company_id: input.companyId,
    name: input.name,
    rate: input.rate,
    is_inclusive: input.isInclusive,
    is_default: input.isDefault,
    is_active: input.isActive,
    tax_number: input.taxNumber ?? null,
    jurisdiction: input.jurisdiction ?? null,
    authority_name: input.authorityName ?? null,
    filing_frequency: input.filingFrequency,
  };

  // If this setting is being made the default, clear the flag on the others
  // first so there's only ever one default per company (enforced in the UI,
  // not the DB, so we do it as a best-effort pre-step here).
  if (input.isDefault) {
    await supabase
      .from("company_tax_settings")
      .update({ is_default: false })
      .eq("company_id", input.companyId)
      .neq("id", input.id ?? "00000000-0000-0000-0000-000000000000");
  }

  const query = input.id
    ? supabase.from("company_tax_settings").update(payload).eq("id", input.id)
    : supabase.from("company_tax_settings").insert(payload);

  const { data, error } = await query.select("*").single();
  if (error) throw new TaxServiceError("SAVE_TAX_SETTING_FAILED", error.message);
  return data as TaxSetting;
}

export async function deleteTaxSetting(id: string): Promise<void> {
  const { error } = await supabase.from("company_tax_settings").delete().eq("id", id);
  if (error) throw new TaxServiceError("DELETE_TAX_SETTING_FAILED", error.message);
}
