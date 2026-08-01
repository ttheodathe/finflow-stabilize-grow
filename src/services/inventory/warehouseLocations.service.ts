import { supabase as _sb } from "@/integrations/supabase/client";
// Tables are provisioned by supabase/*.sql migrations that are not reflected in
// the generated Database types yet; use an untyped client until types are regenerated.
const supabase = _sb as any;
import { InventoryServiceError } from "./inventoryServiceError";
import type {
  WarehouseLocation,
  WarehouseLocationNode,
  WarehouseLocationType,
} from "@/types/inventory.types";

export async function listWarehouseLocations(warehouseId: string): Promise<WarehouseLocation[]> {
  const { data, error } = await supabase
    .from("warehouse_locations")
    .select("*")
    .eq("warehouse_id", warehouseId)
    .order("location_type", { ascending: true })
    .order("code", { ascending: true });

  if (error) throw new InventoryServiceError("FETCH_LOCATIONS_FAILED", error.message);
  return (data ?? []) as WarehouseLocation[];
}

export interface CreateWarehouseLocationInput {
  companyId: string;
  warehouseId: string;
  parentLocationId?: string | null;
  locationType: WarehouseLocationType;
  code: string;
  name?: string | null;
  barcode?: string | null;
}

export async function createWarehouseLocation(
  input: CreateWarehouseLocationInput,
): Promise<WarehouseLocation> {
  const { data, error } = await supabase
    .from("warehouse_locations")
    .insert({
      company_id: input.companyId,
      warehouse_id: input.warehouseId,
      parent_location_id: input.parentLocationId ?? null,
      location_type: input.locationType,
      code: input.code,
      name: input.name ?? null,
      barcode: input.barcode ?? null,
    })
    .select("*")
    .single();

  if (error) throw new InventoryServiceError("CREATE_LOCATION_FAILED", error.message);
  return data as WarehouseLocation;
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  const { error } = await supabase.from("warehouse_locations").delete().eq("id", id);
  if (error) throw new InventoryServiceError("DELETE_LOCATION_FAILED", error.message);
}

/** Builds a parent/child tree from the flat list returned by the API. */
export function buildLocationTree(locations: WarehouseLocation[]): WarehouseLocationNode[] {
  const byId = new Map<string, WarehouseLocationNode>(
    locations.map((l) => [l.id, { ...l, children: [] }]),
  );
  const roots: WarehouseLocationNode[] = [];

  for (const node of byId.values()) {
    if (node.parent_location_id && byId.has(node.parent_location_id)) {
      byId.get(node.parent_location_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
