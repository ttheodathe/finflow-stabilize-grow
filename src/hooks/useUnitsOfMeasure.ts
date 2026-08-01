import { useQuery } from "@tanstack/react-query";
import { listUnitsOfMeasure } from "@/services/inventory/unitsOfMeasure.service";
import type { UnitOfMeasure } from "@/types/inventory.types";

export function useUnitsOfMeasure(companyId: string) {
  const query = useQuery<UnitOfMeasure[]>({
    queryKey: ["units-of-measure", companyId],
    queryFn: () => listUnitsOfMeasure(companyId),
    enabled: Boolean(companyId),
    staleTime: 5 * 60_000, // rarely changes
  });

  return {
    unitsOfMeasure: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
