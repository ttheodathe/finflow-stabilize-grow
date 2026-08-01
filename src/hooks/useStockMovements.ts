import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listStockMovements,
  receiveStock,
  transferStock,
  adjustStock,
  type ListStockMovementsOptions,
} from "@/services/inventory/stockMovements.service";
import type {
  AdjustStockInput,
  ReceiveStockInput,
  StockMovement,
  TransferStockInput,
} from "@/types/inventory.types";

function stockMovementsQueryKey(companyId: string, options: ListStockMovementsOptions) {
  return ["stock-movements", companyId, options] as const;
}

/** Any mutation here can move stock at a warehouse this query didn't ask about
 *  (e.g. a transfer touches two warehouses at once), so on success we
 *  invalidate every stock-movements / inventory-balances query for the
 *  company rather than trying to guess which specific keys changed. */
function invalidateInventoryQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  companyId: string,
) {
  queryClient.invalidateQueries({ queryKey: ["stock-movements", companyId] });
  queryClient.invalidateQueries({ queryKey: ["inventory-balances", companyId] });
}

export function useStockMovements(companyId: string, options: ListStockMovementsOptions = {}) {
  const queryClient = useQueryClient();

  const query = useQuery<StockMovement[]>({
    queryKey: stockMovementsQueryKey(companyId, options),
    queryFn: () => listStockMovements(companyId, options),
    enabled: Boolean(companyId),
  });

  const receiveMutation = useMutation({
    mutationFn: (input: ReceiveStockInput) => receiveStock(input),
    onSuccess: () => invalidateInventoryQueries(queryClient, companyId),
  });

  const transferMutation = useMutation({
    mutationFn: (input: TransferStockInput) => transferStock(input),
    onSuccess: () => invalidateInventoryQueries(queryClient, companyId),
  });

  const adjustMutation = useMutation({
    mutationFn: (input: AdjustStockInput) => adjustStock(input),
    onSuccess: () => invalidateInventoryQueries(queryClient, companyId),
  });

  return {
    movements: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    receiveStock: receiveMutation.mutateAsync,
    transferStock: transferMutation.mutateAsync,
    adjustStock: adjustMutation.mutateAsync,
    isReceiving: receiveMutation.isPending,
    isTransferring: transferMutation.isPending,
    isAdjusting: adjustMutation.isPending,
  };
}
