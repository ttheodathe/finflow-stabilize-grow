import { supabase as _sb } from "@/integrations/supabase/client";
// Tables are provisioned by supabase/*.sql migrations that are not reflected in
// the generated Database types yet; use an untyped client until types are regenerated.
const supabase = _sb as any;
import { InventoryServiceError } from "./inventoryServiceError";
import type { Brand } from "@/types/inventory.types";

export async function listBrands(companyId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error) throw new InventoryServiceError("FETCH_BRANDS_FAILED", error.message);
  return (data ?? []) as Brand[];
}

export async function createBrand(
  companyId: string,
  name: string,
  logoUrl?: string | null,
): Promise<Brand> {
  const { data, error } = await supabase
    .from("brands")
    .insert({ company_id: companyId, name, logo_url: logoUrl ?? null })
    .select("*")
    .single();

  if (error) throw new InventoryServiceError("CREATE_BRAND_FAILED", error.message);
  return data as Brand;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw new InventoryServiceError("DELETE_BRAND_FAILED", error.message);
}
