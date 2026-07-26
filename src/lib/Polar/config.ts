/**
 * Polar Billing configuration for FinFlow.
 * Mirrors src/lib/paddle/config.ts — same PlanKey/BillingCycle model,
 * different provider-specific product IDs.
 */
import type { PlanKey, BillingCycle } from "@/lib/paddle/config";

export const POLAR_ENV: "sandbox" | "production" = "production";

export const POLAR_PRODUCTS: Record
  Exclude<PlanKey, "free" | "enterprise">,
  { monthly: string | null; yearly: string | null }
> = {
  pro: {
    monthly: "b403575d-c632-430c-a087-6340b7a002d1",
    yearly: "c42021b3-d7bd-48c1-a222-2670f427b102",
  },
  business: {
    monthly: "ec7fc077-6065-4207-90ca-95f3052cfadc",
    yearly: "d59bb989-88d4-44e1-8606-7f6862615510",
  },
};

// Polar's free product — mainly useful if you ever route free-tier
// signups through a Polar checkout too. Not used by the plan-mapping
// logic below since 'free' is excluded from POLAR_PRODUCTS.
export const POLAR_FREE_PRODUCT_ID = "a8df20fe-7979-4d74-bec6-48b4e310955b";

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
  if (productId === POLAR_FREE_PRODUCT_ID) return null; // handled separately, no plan/cycle upgrade
  for (const plan of Object.keys(POLAR_PRODUCTS) as Array
    keyof typeof POLAR_PRODUCTS
  >) {
    const cfg = POLAR_PRODUCTS[plan];
    if (cfg.monthly === productId) return { plan, cycle: "monthly" };
    if (cfg.yearly === productId) return { plan, cycle: "yearly" };
  }
  return null;
}
