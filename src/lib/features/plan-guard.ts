/**
 * Server-side plan enforcement for gated features.
 *
 * Client gating (useFeatureGate) is UX only — every AI/OCR server function
 * calls assertFeature() so a locked plan can't reach the AI gateway.
 */
import { normalizePlan, type PlanKey } from "@/lib/paddle/config";
import { planHasFeature, requiredPlanName, type FeatureKey } from "./catalog";

const ENTITLED = new Set(["active", "trialing", "past_due"]);

export async function resolvePlan(
  // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
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
    const { data } = await base().eq("company_id", opts.companyId);
    row = data?.[0];
  }
  if (!row) {
    // Rows created before company linkage (or by webhooks) key off the user.
    const { data } = await base().or(`owner_id.eq.${opts.userId},user_id.eq.${opts.userId}`);
    row = data?.[0];
  }
  if (!row || !ENTITLED.has(row.status)) return "free";
  return normalizePlan(row.plan);
}

export async function assertFeature(
  // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
  supabase: any,
  opts: { userId: string; companyId?: string | null },
  feature: FeatureKey,
): Promise<void> {
  const plan = await resolvePlan(supabase, opts);
  if (planHasFeature(plan, feature)) return;
  throw new Error(
    `AI document scanning is available on the ${requiredPlanName(feature)} plan and above. Upgrade your plan to continue.`,
  );
}
