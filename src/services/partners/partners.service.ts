import { supabase } from "@/integrations/supabase/client";
import {
  PartnerServiceError,
  type Partner,
  type PartnerCommission,
  type PartnerDashboardStats,
} from "@/types/partner.types";

/** The signed-in user's own partner record, or null if they aren't a partner. */
export async function getMyPartnerRecord(): Promise<Partner | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) throw new PartnerServiceError("FETCH_PARTNER_FAILED", error.message);
  return data as Partner | null;
}

export async function getPartnerDashboardStats(partnerId: string): Promise<PartnerDashboardStats> {
  const [clicksRes, attributionsRes, commissionsRes] = await Promise.all([
    supabase.from("partner_referral_clicks").select("visitor_id").eq("partner_id", partnerId),
    supabase
      .from("partner_referral_attributions")
      .select("id")
      .eq("last_touch_partner_id", partnerId),
    supabase
      .from("partner_commissions")
      .select("status, commission_amount, currency")
      .eq("partner_id", partnerId),
  ]);

  if (clicksRes.error) throw new PartnerServiceError("FETCH_STATS_FAILED", clicksRes.error.message);
  if (attributionsRes.error)
    throw new PartnerServiceError("FETCH_STATS_FAILED", attributionsRes.error.message);
  if (commissionsRes.error)
    throw new PartnerServiceError("FETCH_STATS_FAILED", commissionsRes.error.message);

  const clicks = clicksRes.data ?? [];
  const uniqueVisitors = new Set(clicks.map((c) => c.visitor_id)).size;
  const commissions = (commissionsRes.data ?? []) as Pick<
    PartnerCommission,
    "status" | "commission_amount" | "currency"
  >[];
  const currencies = new Set(commissions.map((commission) => commission.currency.toUpperCase()));
  const sum = (statuses: PartnerCommission["status"][]) =>
    commissions
      .filter((c) => statuses.includes(c.status))
      .reduce((acc, c) => acc + Number(c.commission_amount), 0);

  // The legacy dashboard model exposes one currency. Avoid presenting a misleading
  // cross-currency total; show zero totals until a multi-currency dashboard is introduced.
  const singleCurrency = currencies.size <= 1;
  return {
    totalClicks: clicks.length,
    uniqueVisitors,
    totalSignups: attributionsRes.data?.length ?? 0,
    pendingCommissions: singleCurrency ? sum(["pending"]) : 0,
    approvedCommissions: singleCurrency ? sum(["approved"]) : 0,
    paidCommissions: singleCurrency ? sum(["paid"]) : 0,
    lifetimeEarnings: singleCurrency ? sum(["approved", "paid"]) : 0,
    currency: currencies.size === 1 ? [...currencies][0] : "USD",
  };
}

export async function listPartnerCommissions(partnerId: string): Promise<PartnerCommission[]> {
  const { data, error } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) throw new PartnerServiceError("FETCH_COMMISSIONS_FAILED", error.message);
  return (data ?? []) as PartnerCommission[];
}

// Staff-only surfaces (RLS-gated) -------------------------------------------------

export async function listAllPartners(status?: Partner["status"]): Promise<Partner[]> {
  let query = supabase.from("partners").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new PartnerServiceError("FETCH_PARTNERS_FAILED", error.message);
  return (data ?? []) as Partner[];
}

export async function setPartnerStatus(
  partnerId: string,
  status: Partner["status"],
): Promise<Partner> {
  const { data, error } = await supabase.rpc("set_partner_status", {
    p_partner_id: partnerId,
    p_status: status,
  });

  if (error) throw new PartnerServiceError("UPDATE_PARTNER_STATUS_FAILED", error.message);
  return data as Partner;
}
