import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listWarehouseLocations,
  createWarehouseLocation,
  deleteWarehouseLocation,
  buildLocationTree,
  type CreateWarehouseLocationInput,
} from "@/services/inventory/warehouseLocations.service";
import type { WarehouseLocation } from "@/types/inventory.types";

export function warehouseLocationsQueryKey(warehouseId: string) {
  return ["warehouse-locations", warehouseId] as const;
}

export function useWarehouseLocations(warehouseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<WarehouseLocation[]>({
    queryKey: warehouseLocationsQueryKey(warehouseId),
    queryFn: () => listWarehouseLocations(warehouseId),
    enabled: Boolean(warehouseId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: warehouseLocationsQueryKey(warehouseId) });

  const createMutation = useMutation({
    mutationFn: (input: CreateWarehouseLocationInput) => createWarehouseLocation(input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWarehouseLocation(id),
    onSuccess: invalidate,
  });

  const locations = query.data ?? [];

  return {
    locations,
    tree: buildLocationTree(locations),
    isLoading: query.isLoading,
    error: query.error,
    createLocation: createMutation.mutateAsync,
    deleteLocation: deleteMutation.mutateAsync,
  };
}
