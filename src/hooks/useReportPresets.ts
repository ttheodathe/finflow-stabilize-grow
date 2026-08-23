import { useCallback, useEffect, useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations
// (same pattern used across the app — see customers.tsx).
const supabase = _sb as any; // untyped-db
import { toast } from "sonner";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export type ReportKey = "pnl" | "balance-sheet" | "cash-flow" | "ar-aging" | "ap-aging";

export type ReportPreset<TConfig> = {
  id: string;
  name: string;
  config: TConfig;
};

/**
 * Saved, reusable report filter presets — personal to the signed-in user,
 * scoped to the active company (report_view_presets table).
 *
 * Usage: const { presets, save, remove } = useReportPresets<PnlConfig>("pnl");
 */
export function useReportPresets<TConfig extends Record<string, unknown>>(
  reportKey: ReportKey,
) {
  const companyId = useActiveCompanyId();
  const [presets, setPresets] = useState<ReportPreset<TConfig>[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("report_view_presets")
      .select("id, name, config")
      .eq("company_id", companyId)
      .eq("report_key", reportKey)
      .order("name");
    setLoading(false);
    if (error) return; // presets are a convenience feature; fail quietly
    setPresets((data ?? []) as ReportPreset<TConfig>[]);
  }, [companyId, reportKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(name: string, config: TConfig) {
    if (!companyId) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("report_view_presets").insert({
      user_id: u.user.id,
      company_id: companyId,
      report_key: reportKey,
      name,
      config,
    });
    if (error) return toast.error(error.message);
    toast.success(`Saved preset "${name}"`);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("report_view_presets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return { presets, loading, save, remove };
}
