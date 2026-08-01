import { useQuery } from "@tanstack/react-query";
import { listInventoryBalances } from "@/services/inventory/inventoryBalances.service";
import type { InventoryBalanceWithItem } from "@/types/inventory.types";

export function useInventoryBalances(companyId: string, warehouseId?: string) {
  const query = useQuery<InventoryBalanceWithItem[]>({
    queryKey: ["inventory-balances", companyId, warehouseId ?? "all"],
    queryFn: () => listInventoryBalances(companyId, warehouseId),
    enabled: Boolean(companyId),
  });

  return {
    balances: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
