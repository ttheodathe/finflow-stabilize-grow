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
    const { data: companyRows, error: companyError } = await base().eq(
      "company_id",
      opts.companyId,
    );
    if (companyError) return "free";
    row = companyRows?.[0];

    if (!row) {
      // A user-level subscription may cover only companies that user owns.
      // Being a member of a paid company must not unlock features in another
      // company where the same user is merely a collaborator.
      const { data: ownership, error: ownershipError } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", opts.companyId)
        .eq("user_id", opts.userId)
        .eq("role", "owner")
        .eq("status", "active")
        .maybeSingle();

      if (ownershipError || !ownership) return "free";

      const { data: userRows, error: userError } = await base()
        .is("company_id", null)
        .or(`owner_id.eq.${opts.userId},user_id.eq.${opts.userId}`);
      if (userError) return "free";
      row = userRows?.[0];
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
