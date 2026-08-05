/**
 * Paddle Sandbox configuration for FinFlow.
 *
 * The client token and price IDs are PUBLIC values (embedded into the
 * browser bundle by design). Secret values (PADDLE_API_KEY,
 * PADDLE_WEBHOOK_SECRET) are read from process.env inside server code only.
 *
 * Note: `VITE_*` env vars are reserved on this platform, so the public
 * values are inlined here rather than plumbed through import.meta.env.
 * When moving from sandbox to production, update this file (or wire it
 * through a server-fn config loader) and re-deploy.
 */

export const PADDLE_ENV: "sandbox" | "production" = "production";

export const PADDLE_CLIENT_TOKEN = "live_eec1e36af01cc44ad8008a0d1ab";

export type PlanKey = "free" | "pro" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanLimits {
  companyLimit: number; // Infinity for unlimited
  memberLimit: number;
  inventory: boolean;
  warehouses: boolean;
  purchaseOrders: boolean;
  bankReconciliation: boolean;
  advancedReports: boolean;
  payroll: boolean;
  crm: boolean;
  projects: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
  aiBookkeeper: boolean;
}

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  priceMonthly: number | null; // null = custom pricing (Enterprise)
  priceYearly: number | null; // null = custom pricing (Enterprise)
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  features: string[];
  limits: PlanLimits;
  highlight?: boolean;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  free: {
    key: "free",
    name: "Free",
    description: "For individuals and small businesses getting started.",
    priceMonthly: 0,
    priceYearly: 0,
    monthlyPriceId: null,
    yearlyPriceId: null,
    features: [
      "Basic accounting",
      "Invoice creation",
      "Expense tracking",
      "Customer management",
      "Basic reports",
    ],
    limits: {
      companyLimit: 1,
      memberLimit: 2,
      inventory: false,
      warehouses: false,
      purchaseOrders: false,
      bankReconciliation: false,
      advancedReports: false,
      payroll: false,
      crm: false,
      projects: false,
      auditLogs: false,
      apiAccess: false,
      aiBookkeeper: false,
    },
  },
  pro: {
    key: "pro",
    name: "Professional",
    description:
      "Designed for growing businesses that need collaboration, automation, inventory, and advanced reporting.",
    priceMonthly: 19,
    priceYearly: 190,
    monthlyPriceId: "pri_01ky1bex55qaqvhwscpyyry90f",
    yearlyPriceId: "pri_01ky1cy1ehy5dzbnsej8hrya5b",
    features: [
      "Everything in Free",
      "Up to 5 Companies",
      "Up to 15 Team Members",
      "Inventory Management",
      "Warehouses",
      "Purchase Orders",
      "Bank Reconciliation",
      "Advanced Reports",
      "AI Bookkeeper",
      "Role-Based Permissions",
      "Priority Email Support",
    ],
    limits: {
      companyLimit: 5,
      memberLimit: 15,
      inventory: true,
      warehouses: true,
      purchaseOrders: true,
      bankReconciliation: true,
      advancedReports: true,
      payroll: false,
      crm: false,
      projects: false,
      auditLogs: false,
      apiAccess: false,
      aiBookkeeper: true,
    },
    highlight: true,
  },
  business: {
    key: "business",
    name: "Business",
    description:
      "Built for established businesses managing multiple departments, users, and companies.",
    priceMonthly: 49,
    priceYearly: 490,
    monthlyPriceId: "pri_01ky1babq24bwz5fw9ka312sv2",
    yearlyPriceId: "pri_01ky1d1h4rxe45hbj3zactjxy7",
    features: [
      "Everything in Professional",
      "Up to 25 Companies",
      "Unlimited Team Members",
      "Payroll",
      "CRM",
      "Projects",
      "Audit Logs",
      "Advanced Analytics",
      "API Access",
      "Priority Support",
    ],
    limits: {
      companyLimit: 25,
      memberLimit: Number.POSITIVE_INFINITY,
      inventory: true,
      warehouses: true,
      purchaseOrders: true,
      bankReconciliation: true,
      advancedReports: true,
      payroll: true,
      crm: true,
      projects: true,
      auditLogs: true,
      apiAccess: true,
      aiBookkeeper: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description:
      "Tailored solutions for organizations requiring custom deployments, integrations, and enterprise support.",
    // Fix: was 0/0, which rendered as "$0/month" — the pricing page says
    // "Custom Pricing" for this tier. null is the "ask sales" signal;
    // formatPlanPrice() below renders it correctly.
    priceMonthly: null,
    priceYearly: null,
    monthlyPriceId: null,
    yearlyPriceId: null,
    features: [
      "Unlimited Companies",
      "Unlimited Users",
      "Dedicated Account Manager",
      "Custom Integrations",
      "Advanced Security",
      "Priority Infrastructure",
      "Migration Assistance",
      "Training",
      "SLA Options",
      "Enterprise Support",
    ],
    limits: {
      companyLimit: Number.POSITIVE_INFINITY,
      memberLimit: Number.POSITIVE_INFINITY,
      inventory: true,
      warehouses: true,
      purchaseOrders: true,
      bankReconciliation: true,
      advancedReports: true,
      payroll: true,
      crm: true,
      projects: true,
      auditLogs: true,
      apiAccess: true,
      aiBookkeeper: true,
    },
  },
};

export const PLAN_ORDER: PlanKey[] = ["free", "pro", "business", "enterprise"];

/**
 * Historical/marketing plan names stored in `subscriptions.plan` that are not
 * PlanKeys. Without this map an unknown string ranks below "free", which locks
 * a paying customer out of even the free-tier features.
 */
const PLAN_ALIASES: Record<string, PlanKey> = {
  professional: "pro",
  pro: "pro",
  starter: "pro",
  growth: "business",
  business: "business",
  team: "business",
  enterprise: "enterprise",
  custom: "enterprise",
  free: "free",
  basic: "free",
  trial: "free",
};

/** Normalize any stored plan string to a known PlanKey (defaults to "free"). */
export function normalizePlan(value: string | null | undefined): PlanKey {
  if (!value) return "free";
  const key = value.trim().toLowerCase();
  if ((PLAN_ORDER as string[]).includes(key)) return key as PlanKey;
  return PLAN_ALIASES[key] ?? "free";
}

/** Map a Paddle price_id back to (plan, cycle). Used by webhook handlers. */
export function planFromPriceId(
  priceId: string,
): { plan: PlanKey; cycle: BillingCycle } | null {
  for (const plan of PLAN_ORDER) {
    const cfg = PLANS[plan];
    if (cfg.monthlyPriceId === priceId) return { plan, cycle: "monthly" };
    if (cfg.yearlyPriceId === priceId) return { plan, cycle: "yearly" };
  }
  return null;
}

export function getPriceId(plan: PlanKey, cycle: BillingCycle): string | null {
  const cfg = PLANS[plan];
  return cycle === "monthly" ? cfg.monthlyPriceId : cfg.yearlyPriceId;
}

export function getPlan(key: string | null | undefined): PlanConfig {
  if (!key) return PLANS.free;
  return (PLANS as Record<string, PlanConfig>)[key] ?? PLANS.free;
}

/** Formats a plan's monthly price for display, handling Enterprise's custom pricing. */
export function formatPlanPrice(plan: PlanConfig): string {
  if (plan.priceMonthly === null) return "Custom Pricing";
  if (plan.priceMonthly === 0) return "$0/month";
  return `$${plan.priceMonthly}/month`;
}
