import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  setDefaultWarehouse,
  deleteWarehouse,
  type CreateWarehouseInput,
  type UpdateWarehouseInput,
} from "@/services/inventory/warehouses.service";
import type { Warehouse } from "@/types/inventory.types";

export function warehousesQueryKey(companyId: string) {
  return ["warehouses", companyId] as const;
}

export function useWarehouses(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Warehouse[]>({
    queryKey: warehousesQueryKey(companyId),
    queryFn: () => listWarehouses(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: warehousesQueryKey(companyId) });

  const createMutation = useMutation({
    mutationFn: (input: CreateWarehouseInput) => createWarehouse(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateWarehouseInput) => updateWarehouse(input),
    onSuccess: invalidate,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (warehouseId: string) => setDefaultWarehouse(companyId, warehouseId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: invalidate,
  });

  return {
    warehouses: query.data ?? [],
    defaultWarehouse: (query.data ?? []).find((w) => w.is_default) ?? null,
    isLoading: query.isLoading,
    error: query.error,
    createWarehouse: createMutation.mutateAsync,
    updateWarehouse: updateMutation.mutateAsync,
    setDefaultWarehouse: setDefaultMutation.mutateAsync,
    deleteWarehouse: deleteMutation.mutateAsync,
  };
}
