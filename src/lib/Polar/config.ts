/**
 * Polar Billing configuration for FinFlow.
 * Mirrors src/lib/paddle/config.ts — same PlanKey/BillingCycle model,
 * different provider-specific product IDs.
 */
import type { PlanKey, BillingCycle } from "@/lib/paddle/config";

export const POLAR_ENV: "sandbox" | "production" = "production";

// Fill these in from Polar dashboard → Products (production org).
export const POLAR_PRODUCTS: Record
  Exclude<PlanKey, "free" | "enterprise">,
  { monthly: string | null; yearly: string | null }
> = {
  pro: { monthly: null, yearly: null },
  business: { monthly: null, yearly: null },
};

export function getPolarProductId(
  plan: PlanKey,
  cycle: BillingCycle,
): string | null {
  if (plan === "free" || plan === "enterprise") return null;
  return POLAR_PRODUCTS[plan][cycle];
}

export function planFromPolarProductId(
  productId: string,
): { plan: PlanKey; cycle: BillingCycle } | null {
  for (const plan of Object.keys(POLAR_PRODUCTS) as Array
    keyof typeof POLAR_PRODUCTS
  >) {
    const cfg = POLAR_PRODUCTS[plan];
    if (cfg.monthly === productId) return { plan, cycle: "monthly" };
    if (cfg.yearly === productId) return { plan, cycle: "yearly" };
  }
  return null;
}
