import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTaxDeadlines,
  createTaxDeadline,
  markTaxDeadlineComplete,
  deleteTaxDeadline,
  type CreateTaxDeadlineInput,
} from "@/services/tax/taxDeadlines.service";
import type { TaxDeadline } from "@/types/tax.types";

export function taxDeadlinesQueryKey(companyId: string) {
  return ["tax-deadlines", companyId] as const;
}

export function useTaxDeadlines(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<TaxDeadline[]>({
    queryKey: taxDeadlinesQueryKey(companyId),
    queryFn: () => listTaxDeadlines(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: taxDeadlinesQueryKey(companyId) });

  const createMutation = useMutation({
    mutationFn: (input: CreateTaxDeadlineInput) => createTaxDeadline(input),
    onSuccess: invalidate,
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, taxReturnId }: { id: string; taxReturnId?: string }) =>
      markTaxDeadlineComplete(id, taxReturnId),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxDeadline(id),
    onSuccess: invalidate,
  });

  return {
    deadlines: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createDeadline: createMutation.mutateAsync,
    completeDeadline: completeMutation.mutateAsync,
    deleteDeadline: deleteMutation.mutateAsync,
  };
}
