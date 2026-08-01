import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWarehouse,
  updateWarehouse,
  setDefaultWarehouse,
  deleteWarehouse,
  type UpdateWarehouseInput,
} from "@/services/inventory/warehouses.service";
import { warehousesQueryKey } from "@/hooks/useWarehouses";
import type { Warehouse } from "@/types/inventory.types";

export function warehouseQueryKey(warehouseId: string) {
  return ["warehouse", warehouseId] as const;
}

/** Single-warehouse companion to useWarehouses — for a warehouse detail
 *  view, so callers don't need the full company list just to read/edit
 *  one record. Mutations also invalidate the plural list query so both
 *  stay in sync without the caller having to think about it. */
export function useWarehouse(warehouseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Warehouse | null>({
    queryKey: warehouseQueryKey(warehouseId),
    queryFn: () => getWarehouse(warehouseId),
    enabled: Boolean(warehouseId),
  });

  const warehouse = query.data ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: warehouseQueryKey(warehouseId) });
    if (warehouse?.company_id) {
      queryClient.invalidateQueries({ queryKey: warehousesQueryKey(warehouse.company_id) });
    }
  };

  const updateMutation = useMutation({
    mutationFn: (input: Omit<UpdateWarehouseInput, "id">) =>
      updateWarehouse({ id: warehouseId, ...input }),
    onSuccess: invalidate,
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => {
      if (!warehouse) throw new Error("Warehouse not loaded yet");
      return setDefaultWarehouse(warehouse.company_id, warehouseId);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWarehouse(warehouseId),
    onSuccess: invalidate,
  });

  return {
    warehouse,
    isLoading: query.isLoading,
    error: query.error,
    updateWarehouse: updateMutation.mutateAsync,
    setDefaultWarehouse: setDefaultMutation.mutateAsync,
    deleteWarehouse: deleteMutation.mutateAsync,
  };
}
