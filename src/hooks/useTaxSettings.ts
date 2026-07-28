import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTaxSettings,
  upsertTaxSetting,
  deleteTaxSetting,
  type UpsertTaxSettingInput,
} from "@/services/tax/taxSettings.service";
import type { TaxSetting } from "@/types/tax.types";

export function taxSettingsQueryKey(companyId: string) {
  return ["tax-settings", companyId] as const;
}

export function useTaxSettings(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<TaxSetting[]>({
    queryKey: taxSettingsQueryKey(companyId),
    queryFn: () => listTaxSettings(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: taxSettingsQueryKey(companyId) });

  const saveMutation = useMutation({
    mutationFn: (input: UpsertTaxSettingInput) => upsertTaxSetting(input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTaxSetting(id),
    onSuccess: invalidate,
  });

  return {
    settings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveTaxSetting: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteTaxSetting: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
