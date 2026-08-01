import { supabase as _sb } from "@/integrations/supabase/client";
// Tables are provisioned by supabase/*.sql migrations that are not reflected in
// the generated Database types yet; use an untyped client until types are regenerated.
const supabase = _sb as any;
import { InventoryServiceError } from "./inventoryServiceError";
import type { UnitOfMeasure, UomCategory } from "@/types/inventory.types";

/** Returns system-wide units plus this company's own — the full picker list. */
export async function listUnitsOfMeasure(companyId: string): Promise<UnitOfMeasure[]> {
  const { data, error } = await supabase
    .from("units_of_measure")
    .select("*")
    .or(`company_id.is.null,company_id.eq.${companyId}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new InventoryServiceError("FETCH_UOM_FAILED", error.message);
  return (data ?? []) as UnitOfMeasure[];
}

export async function createUnitOfMeasure(
  companyId: string,
  code: string,
  name: string,
  category: UomCategory,
): Promise<UnitOfMeasure> {
  const { data, error } = await supabase
    .from("units_of_measure")
    .insert({ company_id: companyId, code, name, category })
    .select("*")
    .single();

  if (error) throw new InventoryServiceError("CREATE_UOM_FAILED", error.message);
  return data as UnitOfMeasure;
}
