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

export const PADDLE_ENV: "sandbox" | "production" = "sandbox";

export const PADDLE_CLIENT_TOKEN = "live_eec1e36af01cc44ad8008a0d1ab";

export type PlanKey = "free" | "pro" | "business" | "enterprise";
export type BillingCycle = "monthly" | "yearly";

export interface PlanLimits {
  companyLimit: number; // Infinity for unlimited
  memberLimit: number;
  inventory: boolean;
  purchaseOrders: boolean;
  bankReconciliation: boolean;
  advancedReports: boolean;
  payroll: boolean;
  crm: boolean;
  projects: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
}

export interface PlanConfig {
  key: PlanKey;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
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
      purchaseOrders: false,
      bankReconciliation: false,
      advancedReports: false,
      payroll: false,
      crm: false,
      projects: false,
      auditLogs: false,
      apiAccess: false,
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
      "Up to 3 Companies",
      "Up to 10 Team Members",
      "Inventory Management",
      "Purchase Orders",
      "Bank Reconciliation",
      "Advanced Reports",
      "Role-Based Permissions",
      "Priority Email Support",
    ],
    limits: {
      companyLimit: 3,
      memberLimit: 10,
      inventory: true,
      purchaseOrders: true,
      bankReconciliation: true,
      advancedReports: true,
      payroll: false,
      crm: false,
      projects: false,
      auditLogs: false,
      apiAccess: false,
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
      "Up to 15 Companies",
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
      companyLimit: 15,
      memberLimit: Number.POSITIVE_INFINITY,
      inventory: true,
      purchaseOrders: true,
      bankReconciliation: true,
      advancedReports: true,
      payroll: true,
      crm: true,
      projects: true,
      auditLogs: true,
      apiAccess: true,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description:
      "Tailored solutions for organizations requiring custom deployments, integrations, and enterprise support.",
    priceMonthly: 0,
    priceYearly: 0,
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
      purchaseOrders: true,
      bankReconciliation: true,
      advancedReports: true,
      payroll: true,
      crm: true,
      projects: true,
      auditLogs: true,
      apiAccess: true,
    },
  },
};

export const PLAN_ORDER: PlanKey[] = ["free", "pro", "business", "enterprise"];

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