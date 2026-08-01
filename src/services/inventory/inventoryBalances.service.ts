import { supabase } from "@/integrations/supabase/client";
import { InventoryServiceError } from "./inventoryServiceError";
import type { InventoryBalanceWithItem } from "@/types/inventory.types";

/** Per-item, per-warehouse stock levels for the inventory overview page. */
export async function listInventoryBalances(
  companyId: string,
  warehouseId?: string,
): Promise<InventoryBalanceWithItem[]> {
  let query = supabase
    .from("inventory_balances")
    .select("*, items(name, sku, barcode, track_inventory, reorder_level), warehouses(name, code)")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (warehouseId) query = query.eq("warehouse_id", warehouseId);

  const { data, error } = await query;
  if (error) throw new InventoryServiceError("FETCH_INVENTORY_BALANCES_FAILED", error.message);
  return (data ?? []) as unknown as InventoryBalanceWithItem[];
}

/** All warehouse balances for a single item — used on the product edit view. */
export async function listBalancesForItem(itemId: string): Promise<InventoryBalanceWithItem[]> {
  const { data, error } = await supabase
    .from("inventory_balances")
    .select("*, items(name, sku, barcode, track_inventory, reorder_level), warehouses(name, code)")
    .eq("item_id", itemId);

  if (error) throw new InventoryServiceError("FETCH_ITEM_BALANCES_FAILED", error.message);
  return (data ?? []) as unknown as InventoryBalanceWithItem[];
}
