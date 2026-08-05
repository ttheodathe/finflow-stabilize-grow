/**
 * Server-side plan enforcement for gated features.
 *
 * Client gating (useFeatureGate) is UX only — every AI/OCR server function
 * calls assertFeature() so a locked plan can't reach the AI gateway.
 */
import { PLANS, type PlanKey } from "@/lib/paddle/config";
import { planHasFeature, requiredPlanName, type FeatureKey } from "./catalog";

const ENTITLED = new Set(["active", "trialing"]);

export async function resolvePlan(
  // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
  supabase: any,
  opts: { userId: string; companyId?: string | null },
): Promise<PlanKey> {
  let q = supabase
    .from("subscriptions")
    .select("plan,status")
    .order("updated_at", { ascending: false })
    .limit(1);
  q = opts.companyId ? q.eq("company_id", opts.companyId) : q.eq("owner_id", opts.userId);
  const { data } = await q;
  const row = data?.[0];
  if (!row || !ENTITLED.has(row.status)) return "free";
  return (row.plan as PlanKey) in PLANS ? (row.plan as PlanKey) : "free";
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
