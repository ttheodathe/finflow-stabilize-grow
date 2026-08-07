import { supabase } from "@/integrations/supabase/client";
import { PartnerServiceError } from "@/types/partner.types";

export interface PartnerPayout {
  id: string;
  partner_id: string;
  status: "pending" | "paid" | "failed";
  total_amount: number;
  currency: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export async function listPartnerPayouts(partnerId: string): Promise<PartnerPayout[]> {
  const { data, error } = await supabase
    .from("partner_payouts")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });

  if (error) throw new PartnerServiceError("FETCH_PAYOUTS_FAILED", error.message);
  return (data ?? []) as PartnerPayout[];
}

export async function createPartnerPayout(
  partnerId: string,
  commissionIds: string[],
  opts?: { method?: string; reference?: string; notes?: string },
): Promise<PartnerPayout> {
  const { data, error } = await supabase.rpc("create_partner_payout", {
    p_partner_id: partnerId,
    p_commission_ids: commissionIds,
    p_method: opts?.method,
    p_reference: opts?.reference,
    p_notes: opts?.notes,
  });
  if (error) throw new PartnerServiceError("CREATE_PAYOUT_FAILED", error.message);
  return data as PartnerPayout;
}

export async function markPayoutPaid(payoutId: string): Promise<PartnerPayout> {
  const { data, error } = await supabase.rpc("mark_partner_payout_paid", { p_payout_id: payoutId });
  if (error) throw new PartnerServiceError("MARK_PAYOUT_PAID_FAILED", error.message);
  return data as PartnerPayout;
}

// Staff-only: every approved (unpaid) commission across all partners,
// grouped by partner — this is the admin's payout queue.
export async function listApprovedCommissionsByPartner(): Promise<
  Record<
    string,
    {
      partnerId: string;
      businessName: string;
      currency: string;
      commissions: { id: string; commission_amount: number }[];
    }
  >
> {
  const [commissionsRes, partnersRes] = await Promise.all([
    supabase
      .from("partner_commissions")
      .select("id, partner_id, commission_amount, currency")
      .eq("status", "approved"),
    supabase.from("partners").select("id, business_name"),
  ]);

  if (commissionsRes.error)
    throw new PartnerServiceError(
      "FETCH_APPROVED_COMMISSIONS_FAILED",
      commissionsRes.error.message,
    );
  if (partnersRes.error)
    throw new PartnerServiceError("FETCH_APPROVED_COMMISSIONS_FAILED", partnersRes.error.message);

  const businessNameById = new Map(
    (partnersRes.data ?? []).map((p) => [p.id, p.business_name] as const),
  );

  const grouped: Record<
    string,
    {
      partnerId: string;
      businessName: string;
      currency: string;
      commissions: { id: string; commission_amount: number }[];
    }
  > = {};

  for (const row of commissionsRes.data ?? []) {
    const partnerId = row.partner_id;
    const businessName = businessNameById.get(partnerId) ?? "Unknown partner";
    if (!grouped[partnerId]) {
      grouped[partnerId] = { partnerId, businessName, currency: row.currency, commissions: [] };
    }
    grouped[partnerId].commissions.push({
      id: row.id,
      commission_amount: Number(row.commission_amount),
    });
  }

  return grouped;
}
