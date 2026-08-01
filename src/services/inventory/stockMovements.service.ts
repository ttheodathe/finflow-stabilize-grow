import { supabase } from "@/integrations/supabase/client";
import { InventoryServiceError } from "./inventoryServiceError";
import type {
  AdjustStockInput,
  ReceiveStockInput,
  StockMovement,
  TransferStockInput,
} from "@/types/inventory.types";

export interface ListStockMovementsOptions {
  itemId?: string;
  warehouseId?: string;
  limit?: number;
}

export async function listStockMovements(
  companyId: string,
  options: ListStockMovementsOptions = {},
): Promise<StockMovement[]> {
  let query = supabase
    .from("stock_movements")
    .select("*, items(name, sku), invoices(invoice_number), warehouses(name, code)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 500);

  if (options.itemId) query = query.eq("item_id", options.itemId);
  if (options.warehouseId) query = query.eq("warehouse_id", options.warehouseId);

  const { data, error } = await query;
  if (error) throw new InventoryServiceError("FETCH_STOCK_MOVEMENTS_FAILED", error.message);
  return (data ?? []) as unknown as StockMovement[];
}

/** Goods receipt — debits Inventory, credits the chosen offset account (e.g. Accounts Payable). */
export async function receiveStock(input: ReceiveStockInput): Promise<StockMovement> {
  const { data, error } = await supabase.rpc("receive_stock", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_warehouse_id: input.warehouseId,
    p_quantity: input.quantity,
    p_unit_cost: input.unitCost,
    p_offset_account_id: input.offsetAccountId ?? null,
    p_location_id: input.locationId ?? null,
    p_note: input.note ?? null,
    p_po_item_id: input.poItemId ?? null,
  });
  if (error) throw new InventoryServiceError("RECEIVE_STOCK_FAILED", error.message);
  return data as StockMovement;
}

/** Moves stock between two warehouses of the same company. No accounting impact. */
export async function transferStock(
  input: TransferStockInput,
): Promise<{ movement_out: StockMovement; movement_in: StockMovement }> {
  const { data, error } = await supabase.rpc("transfer_stock", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_warehouse_id: input.fromWarehouseId,
    p_to_warehouse_id: input.toWarehouseId,
    p_quantity: input.quantity,
    p_from_location_id: input.fromLocationId ?? null,
    p_to_location_id: input.toLocationId ?? null,
    p_note: input.note ?? null,
  });
  if (error) throw new InventoryServiceError("TRANSFER_STOCK_FAILED", error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { movement_out: StockMovement; movement_in: StockMovement };
}

/** Cycle counts, damage, loss, found stock, and manual corrections. */
export async function adjustStock(input: AdjustStockInput): Promise<StockMovement> {
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_warehouse_id: input.warehouseId,
    p_quantity_delta: input.quantityDelta,
    p_reason: input.reason,
    p_offset_account_id: input.offsetAccountId ?? null,
    p_location_id: input.locationId ?? null,
    p_note: input.note ?? null,
  });
  if (error) throw new InventoryServiceError("ADJUST_STOCK_FAILED", error.message);
  return data as StockMovement;
}
