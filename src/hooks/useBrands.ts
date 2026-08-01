import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBrands, createBrand, deleteBrand } from "@/services/inventory/brands.service";
import type { Brand } from "@/types/inventory.types";

export function brandsQueryKey(companyId: string) {
  return ["brands", companyId] as const;
}

export function useBrands(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<Brand[]>({
    queryKey: brandsQueryKey(companyId),
    queryFn: () => listBrands(companyId),
    enabled: Boolean(companyId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: brandsQueryKey(companyId) });

  const createMutation = useMutation({
    mutationFn: ({ name, logoUrl }: { name: string; logoUrl?: string | null }) =>
      createBrand(companyId, name, logoUrl),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBrand(id),
    onSuccess: invalidate,
  });

  return {
    brands: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createBrand: createMutation.mutateAsync,
    deleteBrand: deleteMutation.mutateAsync,
  };
}
