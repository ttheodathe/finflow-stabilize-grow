import { supabase as _sb } from "@/integrations/supabase/client";
// Tables are provisioned by supabase/*.sql migrations that are not reflected in
// the generated Database types yet; use an untyped client until types are regenerated.
const supabase = _sb as any;
import { InventoryServiceError } from "./inventoryServiceError";
import type { ProductVariant } from "@/types/inventory.types";

const VARIANT_COLUMNS =
  "id, company_id, name, sku, price, cost, stock_quantity, is_active, brand_id, uom_id, " +
  "barcode, qr_code_value, reorder_level, safety_stock, max_stock, lead_time_days, " +
  "default_warehouse_id, inventory_account_id, cogs_account_id, revenue_account_id, " +
  "parent_item_id, variant_attributes";

export async function listProductVariants(parentItemId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase
    .from("items")
    .select(VARIANT_COLUMNS)
    .eq("parent_item_id", parentItemId)
    .order("name", { ascending: true });

  if (error) throw new InventoryServiceError("FETCH_VARIANTS_FAILED", error.message);
  return (data ?? []) as unknown as ProductVariant[];
}

export interface CreateVariantInput {
  companyId: string;
  parentItemId: string;
  name: string;
  sku?: string | null;
  price: number;
  cost: number;
  trackInventory?: boolean;
  variantAttributes: Record<string, string>;
}

/** Creates a variant as a normal `items` row (type='product') scoped under
 *  its parent via parent_item_id, so it's usable on invoices/bills/POs
 *  exactly like any other item — no separate variant plumbing needed. */
export async function createProductVariant(input: CreateVariantInput): Promise<ProductVariant> {
  const { data: parent, error: parentError } = await supabase
    .from("items")
    .select("category_id, tax_rate, currency, unit, uom_id, brand_id, default_warehouse_id")
    .eq("id", input.parentItemId)
    .single();
  if (parentError) throw new InventoryServiceError("FETCH_PARENT_ITEM_FAILED", parentError.message);

  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError || !userRes.user) {
    throw new InventoryServiceError(
      "NOT_AUTHENTICATED",
      "You must be signed in to create a variant.",
    );
  }

  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userRes.user.id,
      company_id: input.companyId,
      type: "product",
      name: input.name,
      sku: input.sku ?? null,
      price: input.price,
      cost: input.cost,
      category_id: parent?.category_id ?? null,
      tax_rate: parent?.tax_rate ?? 0,
      currency: parent?.currency ?? "USD",
      unit: parent?.unit ?? "unit",
      uom_id: parent?.uom_id ?? null,
      brand_id: parent?.brand_id ?? null,
      default_warehouse_id: parent?.default_warehouse_id ?? null,
      track_inventory: input.trackInventory ?? true,
      parent_item_id: input.parentItemId,
      variant_attributes: input.variantAttributes,
    })
    .select(VARIANT_COLUMNS)
    .single();

  if (error) throw new InventoryServiceError("CREATE_VARIANT_FAILED", error.message);
  return data as unknown as ProductVariant;
}

export async function deleteProductVariant(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new InventoryServiceError("DELETE_VARIANT_FAILED", error.message);
}
