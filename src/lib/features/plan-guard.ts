/**
 * Server-side plan enforcement for gated features.
 *
 * Client gating is UX only — every AI/OCR server function re-checks the
 * entitlement for the company being accessed.
 */
import { normalizePlan, type PlanKey } from "@/lib/paddle/config";
import { FEATURES, planHasFeature, requiredPlanName, type FeatureKey } from "./catalog";

const ENTITLED = new Set(["active", "trialing"]);

export async function resolvePlan(
  // biome-ignore lint/suspicious/noExplicitAny: dynamic Supabase schema
  supabase: any,
  opts: { userId: string; companyId?: string | null },
): Promise<PlanKey> {
  const base = () =>
    supabase
      .from("subscriptions")
      .select("plan,status")
      .order("updated_at", { ascending: false })
      .limit(1);

  let row: { plan: string; status: string } | undefined;

  if (opts.companyId) {
    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("id,status")
      .eq("company_id", opts.companyId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (membershipError || membership?.status !== "active") return "free";

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("user_id")
      .eq("id", opts.companyId)
      .maybeSingle();
    if (companyError || !company?.user_id) return "free";

    // Company-specific subscriptions and the owner's account-level
    // subscription are shared with active members of this company. A
    // collaborator's personal subscription is never used as the fallback.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const adminBase = () =>
      (supabaseAdmin as any)
        .from("subscriptions")
        .select("plan,status")
        .order("updated_at", { ascending: false })
        .limit(1);
    const ownerFilter = `owner_id.eq.${company.user_id},user_id.eq.${company.user_id}`;

    const { data: companyRows, error: companySubscriptionError } = await adminBase()
      .eq("company_id", opts.companyId)
      .or(ownerFilter);
    if (companySubscriptionError) return "free";
    row = companyRows?.[0];

    if (!row) {
      const { data: ownerRows, error: ownerSubscriptionError } = await adminBase()
        .or(ownerFilter);
      if (ownerSubscriptionError) return "free";
      row = ownerRows?.[0];
    }
  } else {
    const { data, error } = await base().or(`owner_id.eq.${opts.userId},user_id.eq.${opts.userId}`);
    if (error) return "free";
    row = data?.[0];
  }

  if (!row || !ENTITLED.has(row.status)) return "free";
  return normalizePlan(row.plan);
}

export async function assertFeature(
  // biome-ignore lint/suspicious/noExplicitAny: dynamic Supabase schema
  supabase: any,
  opts: { userId: string; companyId?: string | null },
  feature: FeatureKey,
): Promise<void> {
  const plan = await resolvePlan(supabase, opts);
  if (planHasFeature(plan, feature)) return;
  throw new Error(
    `${FEATURES[feature].label} is available on the ${requiredPlanName(feature)} plan and above. Upgrade your plan to continue.`,
  );
}
