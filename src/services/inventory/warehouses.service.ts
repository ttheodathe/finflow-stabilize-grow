import { supabase } from "@/integrations/supabase/client";
import { InventoryServiceError } from "./inventoryServiceError";
import type { Warehouse } from "@/types/inventory.types";

export async function listWarehouses(companyId: string): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .eq("company_id", companyId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new InventoryServiceError("FETCH_WAREHOUSES_FAILED", error.message);
  return (data ?? []) as Warehouse[];
}

export interface CreateWarehouseInput {
  companyId: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isDefault?: boolean;
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
  const { data, error } = await supabase
    .from("warehouses")
    .insert({
      company_id: input.companyId,
      code: input.code,
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      is_default: input.isDefault ?? false,
    })
    .select("*")
    .single();

  if (error) throw new InventoryServiceError("CREATE_WAREHOUSE_FAILED", error.message);
  return data as Warehouse;
}

export interface UpdateWarehouseInput {
  id: string;
  code?: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  isActive?: boolean;
}

export async function updateWarehouse(input: UpdateWarehouseInput): Promise<Warehouse> {
  const { id, isActive, ...rest } = input;
  const { data, error } = await supabase
    .from("warehouses")
    .update({
      ...rest,
      ...(isActive !== undefined ? { is_active: isActive } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new InventoryServiceError("UPDATE_WAREHOUSE_FAILED", error.message);
  return data as Warehouse;
}

/** Sets this warehouse as the company default; the unique partial index
 *  on (company_id) where is_default requires clearing the old default first. */
export async function setDefaultWarehouse(companyId: string, warehouseId: string): Promise<void> {
  const { error: clearError } = await supabase
    .from("warehouses")
    .update({ is_default: false })
    .eq("company_id", companyId)
    .eq("is_default", true);
  if (clearError)
    throw new InventoryServiceError("SET_DEFAULT_WAREHOUSE_FAILED", clearError.message);

  const { error } = await supabase
    .from("warehouses")
    .update({ is_default: true })
    .eq("id", warehouseId);
  if (error) throw new InventoryServiceError("SET_DEFAULT_WAREHOUSE_FAILED", error.message);
}

export async function deleteWarehouse(id: string): Promise<void> {
  const { error } = await supabase.from("warehouses").delete().eq("id", id);
  if (error) throw new InventoryServiceError("DELETE_WAREHOUSE_FAILED", error.message);
}
