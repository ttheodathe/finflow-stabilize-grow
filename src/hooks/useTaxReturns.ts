import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTaxReturns,
  getTaxReturn,
  listTaxReturnLines,
  createReturnForPeriod,
  submitTaxReturn,
  updateTaxReturnStatus,
  deleteTaxReturn,
} from "@/services/tax/taxReturns.service";
import type { TaxReturn, TaxReturnLine, TaxSetting } from "@/types/tax.types";

export function taxReturnsQueryKey(companyId: string) {
  return ["tax-returns", companyId] as const;
}
export function taxReturnQueryKey(returnId: string) {
  return ["tax-return", returnId] as const;
}
export function taxReturnLinesQueryKey(returnId: string) {
  return ["tax-return-lines", returnId] as const;
}

export function useTaxReturns(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<TaxReturn[]>({
    queryKey: taxReturnsQueryKey(companyId),
    queryFn: () => listTaxReturns(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: taxReturnsQueryKey(companyId) });

  const createMutation = useMutation({
    mutationFn: (params: {
      taxSetting: TaxSetting;
      periodStart: string;
      periodEnd: string;
      dueDate: string;
    }) => createReturnForPeriod({ companyId, ...params }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (returnId: string) => deleteTaxReturn(returnId),
    onSuccess: invalidate,
  });

  return {
    returns: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createReturn: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteReturn: deleteMutation.mutateAsync,
  };
}

export function useTaxReturnDetail(returnId: string) {
  const queryClient = useQueryClient();

  const returnQuery = useQuery<TaxReturn>({
    queryKey: taxReturnQueryKey(returnId),
    queryFn: () => getTaxReturn(returnId),
    enabled: Boolean(returnId),
  });

  const linesQuery = useQuery<TaxReturnLine[]>({
    queryKey: taxReturnLinesQueryKey(returnId),
    queryFn: () => listTaxReturnLines(returnId),
    enabled: Boolean(returnId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: taxReturnQueryKey(returnId) });
    queryClient.invalidateQueries({ queryKey: taxReturnLinesQueryKey(returnId) });
  };

  const submitMutation = useMutation({
    mutationFn: (referenceNumber?: string) => submitTaxReturn(returnId, referenceNumber),
    onSuccess: invalidate,
  });

  const statusMutation = useMutation({
    mutationFn: (status: TaxReturn["status"]) => updateTaxReturnStatus(returnId, status),
    onSuccess: invalidate,
  });

  return {
    taxReturn: returnQuery.data,
    lines: linesQuery.data ?? [],
    isLoading: returnQuery.isLoading || linesQuery.isLoading,
    error: returnQuery.error ?? linesQuery.error,
    submitReturn: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    updateStatus: statusMutation.mutateAsync,
  };
}
