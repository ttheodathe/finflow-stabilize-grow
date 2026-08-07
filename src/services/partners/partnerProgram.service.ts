import { supabase } from "@/integrations/supabase/client";
import {
  PartnerServiceError,
  type PartnerCommission,
  type PartnerCommissionStatus,
} from "@/types/partner.types";

export interface PartnerProgramSettings {
  multi_tier_enabled: boolean;
  max_tiers: number;
  tier2_rate: number;
  tier3_rate: number;
}

export async function getProgramSettings(): Promise<PartnerProgramSettings> {
  const { data, error } = await supabase
    .from("partner_program_settings")
    .select("multi_tier_enabled, max_tiers, tier2_rate, tier3_rate")
    .eq("id", true)
    .single();

  if (error) throw new PartnerServiceError("FETCH_SETTINGS_FAILED", error.message);
  return data as PartnerProgramSettings;
}

export async function updateProgramSettings(
  patch: Partial<PartnerProgramSettings>,
): Promise<PartnerProgramSettings> {
  const { data, error } = await supabase
    .from("partner_program_settings")
    .update(patch)
    .eq("id", true)
    .select("multi_tier_enabled, max_tiers, tier2_rate, tier3_rate")
    .single();

  if (error) throw new PartnerServiceError("UPDATE_SETTINGS_FAILED", error.message);
  return data as PartnerProgramSettings;
}

// Staff-only: every commission awaiting review (pending or flagged),
// across all partners — this is the fraud/quality-review queue.
export async function listCommissionsForReview(): Promise<PartnerCommission[]> {
  const { data, error } = await supabase
    .from("partner_commissions")
    .select("*")
    .or("status.eq.pending,flagged_for_review.eq.true")
    .order("created_at", { ascending: false });

  if (error) throw new PartnerServiceError("FETCH_REVIEW_QUEUE_FAILED", error.message);
  return (data ?? []) as PartnerCommission[];
}

export async function reviewCommission(
  commissionId: string,
  status: PartnerCommissionStatus,
  notes?: string,
): Promise<PartnerCommission> {
  const { data, error } = await supabase.rpc("review_partner_commission", {
    p_commission_id: commissionId,
    p_status: status,
    p_notes: notes,
  });
  if (error) throw new PartnerServiceError("REVIEW_COMMISSION_FAILED", error.message);
  return data as PartnerCommission;
}
