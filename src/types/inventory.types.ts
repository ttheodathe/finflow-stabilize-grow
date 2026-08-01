export type UomCategory = "count" | "weight" | "volume" | "length";
export type WarehouseLocationType = "zone" | "aisle" | "shelf" | "bin";

export interface Brand {
  id: string;
  company_id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UnitOfMeasure {
  id: string;
  company_id: string | null; // null = system default, available to every company
  code: string;
  name: string;
  category: UomCategory;
  base_unit_id: string | null;
  conversion_factor: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  code: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocation {
  id: string;
  company_id: string;
  warehouse_id: string;
  parent_location_id: string | null;
  location_type: WarehouseLocationType;
  code: string;
  name: string | null;
  barcode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Client-side tree node built from a flat WarehouseLocation[] list. */
export interface WarehouseLocationNode extends WarehouseLocation {
  children: WarehouseLocationNode[];
}

export interface InventoryBalance {
  id: string;
  company_id: string;
  item_id: string;
  warehouse_id: string;
  location_id: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_incoming: number;
  quantity_available: number;
  created_at: string;
  updated_at: string;
}

/** InventoryBalance joined with the fields the UI needs, without a full item fetch. */
export interface InventoryBalanceWithItem extends InventoryBalance {
  items: {
    name: string;
    sku: string | null;
    barcode: string | null;
    track_inventory: boolean;
    reorder_level: number;
  } | null;
  warehouses: { name: string; code: string } | null;
}

/**
 * A "product" is an `items` row with type = 'product'. There is no
 * separate products table — see the migration header comment for why.
 * This type only lists the inventory-platform columns added on top of
 * the pre-existing Item shape (see components/items-manager.tsx).
 */
export interface ProductInventoryFields {
  brand_id: string | null;
  uom_id: string | null;
  barcode: string | null;
  qr_code_value: string | null;
  reorder_level: number;
  safety_stock: number;
  max_stock: number | null;
  lead_time_days: number;
  default_warehouse_id: string | null;
  inventory_account_id: string | null;
  cogs_account_id: string | null;
  revenue_account_id: string | null;
  parent_item_id: string | null;
  variant_attributes: Record<string, string>;
}

/** A variant is just another `items` row with parent_item_id set. */
export interface ProductVariant extends ProductInventoryFields {
  id: string;
  company_id: string;
  name: string;
  sku: string | null;
  price: number;
  cost: number;
  stock_quantity: number;
  is_active: boolean;
}

export type StockMovementReason =
  | "invoice_paid"
  | "invoice_reversed"
  | "invoice_deleted"
  | "receipt"
  | "dispatch"
  | "transfer_out"
  | "transfer_in"
  | "cycle_count"
  | "damaged"
  | "lost"
  | "found"
  | "correction"
  | "return_in"
  | "return_out";

export type AdjustmentReason = "cycle_count" | "damaged" | "lost" | "found" | "correction";

export interface StockMovement {
  id: string;
  company_id: string;
  user_id: string;
  item_id: string;
  warehouse_id: string | null;
  location_id: string | null;
  invoice_id: string | null;
  quantity_change: number;
  balance_after: number | null;
  reason: StockMovementReason;
  note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  unit_cost: number | null;
  created_at: string;
  items?: { name: string; sku: string | null } | null;
  invoices?: { invoice_number: string } | null;
  warehouses?: { name: string; code: string } | null;
}

export interface ReceiveStockInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  offsetAccountId?: string | null;
  locationId?: string | null;
  note?: string | null;
  poItemId?: string | null;
}

export interface TransferStockInput {
  companyId: string;
  itemId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  note?: string | null;
}

export interface AdjustStockInput {
  companyId: string;
  itemId: string;
  warehouseId: string;
  quantityDelta: number;
  reason: AdjustmentReason;
  offsetAccountId?: string | null;
  locationId?: string | null;
  note?: string | null;
}
