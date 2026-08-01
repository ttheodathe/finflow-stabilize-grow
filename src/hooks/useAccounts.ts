import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AccountOption {
  id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
}

/** Read-only chart-of-accounts list for account pickers (e.g. the offset
 *  account on a stock receipt or adjustment). Full account CRUD lives in
 *  accounting.chart.tsx — this hook is intentionally read-only. */
export function useAccounts(companyId: string) {
  const query = useQuery<AccountOption[]>({
    queryKey: ["accounts-list", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, code, name, type")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as AccountOption[];
    },
    enabled: Boolean(companyId),
    staleTime: 60_000,
  });

  return { accounts: query.data ?? [], isLoading: query.isLoading };
}
