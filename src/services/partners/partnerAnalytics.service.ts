import { supabase } from "@/integrations/supabase/client";
import { PartnerServiceError } from "@/types/partner.types";

export interface PartnerAdminAnalytics {
  totalPartners: number;
  activePartners: number;
  inactivePartners: number;
  totalClicks: number;
  totalSignups: number;
  totalPaidCommissions: number;
  currency: string;
  topPerformers: { partnerId: string; businessName: string; earnings: number }[];
  revenueByCountry: { country: string; earnings: number }[];
}

// Staff-only — RLS restricts every underlying query to is_platform_staff().
export async function getPartnerAdminAnalytics(): Promise<PartnerAdminAnalytics> {
  const [partnersRes, applicationsRes, clicksRes, attributionsRes, commissionsRes] =
    await Promise.all([
      supabase.from("partners").select("id, status, business_name, application_id"),
      supabase.from("partner_applications").select("id, country"),
      supabase.from("partner_referral_clicks").select("id", { count: "exact", head: true }),
      supabase.from("partner_referral_attributions").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_commissions")
        .select("partner_id, status, commission_amount, currency"),
    ]);

  if (partnersRes.error)
    throw new PartnerServiceError("FETCH_ANALYTICS_FAILED", partnersRes.error.message);
  if (applicationsRes.error)
    throw new PartnerServiceError("FETCH_ANALYTICS_FAILED", applicationsRes.error.message);
  if (clicksRes.error)
    throw new PartnerServiceError("FETCH_ANALYTICS_FAILED", clicksRes.error.message);
  if (attributionsRes.error)
    throw new PartnerServiceError("FETCH_ANALYTICS_FAILED", attributionsRes.error.message);
  if (commissionsRes.error)
    throw new PartnerServiceError("FETCH_ANALYTICS_FAILED", commissionsRes.error.message);

  const partners = partnersRes.data ?? [];
  const commissions = commissionsRes.data ?? [];
  const countryByApplicationId = new Map(
    (applicationsRes.data ?? []).map((a) => [a.id, a.country] as const),
  );

  const paidOrApproved = commissions.filter((c) => c.status === "paid" || c.status === "approved");
  const currency = paidOrApproved[0]?.currency ?? "USD";

  const earningsByPartner = new Map<string, number>();
  for (const c of paidOrApproved) {
    earningsByPartner.set(
      c.partner_id,
      (earningsByPartner.get(c.partner_id) ?? 0) + Number(c.commission_amount),
    );
  }

  const topPerformers = partners
    .map((p) => ({
      partnerId: p.id,
      businessName: p.business_name,
      earnings: earningsByPartner.get(p.id) ?? 0,
    }))
    .filter((p) => p.earnings > 0)
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 10);

  const revenueByCountryMap = new Map<string, number>();
  for (const p of partners) {
    const country = (p.application_id && countryByApplicationId.get(p.application_id)) || "Unknown";
    const earnings = earningsByPartner.get(p.id) ?? 0;
    if (earnings > 0) {
      revenueByCountryMap.set(country, (revenueByCountryMap.get(country) ?? 0) + earnings);
    }
  }

  return {
    totalPartners: partners.length,
    activePartners: partners.filter((p) => p.status === "active").length,
    inactivePartners: partners.filter((p) => p.status !== "active").length,
    totalClicks: clicksRes.count ?? 0,
    totalSignups: attributionsRes.count ?? 0,
    totalPaidCommissions: commissions
      .filter((c) => c.status === "paid")
      .reduce((acc, c) => acc + Number(c.commission_amount), 0),
    currency,
    topPerformers,
    revenueByCountry: Array.from(revenueByCountryMap.entries())
      .map(([country, earnings]) => ({ country, earnings }))
      .sort((a, b) => b.earnings - a.earnings),
  };
}
