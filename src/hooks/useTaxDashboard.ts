import { useQuery } from "@tanstack/react-query";
import { listTaxSettings } from "@/services/tax/taxSettings.service";
import { listTaxReturns } from "@/services/tax/taxReturns.service";
import { listTaxDeadlines } from "@/services/tax/taxDeadlines.service";
import type { TaxDashboardSummary } from "@/types/tax.types";

export function taxDashboardQueryKey(companyId: string) {
  return ["tax-dashboard", companyId] as const;
}

export function useTaxDashboard(companyId: string) {
  const query = useQuery<TaxDashboardSummary>({
    queryKey: taxDashboardQueryKey(companyId),
    enabled: Boolean(companyId),
    queryFn: async () => {
      const [settings, returns, deadlines] = await Promise.all([
        listTaxSettings(companyId),
        listTaxReturns(companyId),
        listTaxDeadlines(companyId),
      ]);

      const openReturns = returns.filter((r) => r.status === "draft" || r.status === "in_review");
      const latestOpen = openReturns[0];
      const upcoming = deadlines
        .filter((d) => d.status !== "completed")
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

      return {
        activeSettings: settings.filter((s) => s.is_active).length,
        openReturns: openReturns.length,
        netTaxDueThisPeriod: latestOpen?.net_tax_due ?? 0,
        nextDeadline: upcoming[0] ?? null,
        overdueCount: deadlines.filter((d) => d.status === "overdue").length,
      } satisfies TaxDashboardSummary;
    },
  });

  return {
    summary: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
