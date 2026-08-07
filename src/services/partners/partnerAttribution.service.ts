import { supabase } from "@/integrations/supabase/client";
import {
  clearPendingReferralCode,
  getOrCreateVisitorId,
  getPendingReferralCode,
} from "@/lib/referral";

/**
 * Attributes a newly created company to whichever partner referral code is
 * pending in localStorage (if any). Best-effort and silent on failure —
 * referral attribution should never block company creation, which is the
 * critical path.
 *
 * Call this once, right after a company is created (see companies.tsx).
 */
export async function attributePendingReferralToCompany(companyId: string): Promise<void> {
  const code = getPendingReferralCode();
  if (!code) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  try {
    const { data: partner } = await supabase
      .from("partners")
      .select("id, status")
      .eq("referral_code", code)
      .maybeSingle();

    if (!partner || partner.status !== "active") return;

    const { error } = await supabase.from("partner_referral_attributions").insert({
      company_id: companyId,
      referred_user_id: userData.user.id,
      first_touch_partner_id: partner.id,
      last_touch_partner_id: partner.id,
      visitor_id: getOrCreateVisitorId(),
    });

    // A unique(company_id) violation just means this company was already
    // attributed (e.g. the effect ran twice) — not an error worth surfacing.
    if (!error) clearPendingReferralCode();
  } catch {
    // Swallow — see function docstring.
  }
}
