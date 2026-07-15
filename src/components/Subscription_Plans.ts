/**
 * Reusable subscription plan configuration for Boom Accounting / FreeFlow Accounts.
 *
 * Source of truth is the `subscription_plans` table in Supabase. This file is a
 * typed, static mirror used for pricing/signup UI so pages don't need a network
 * round-trip just to render plan cards. Keep PLAN_KEYS in sync with the `key`
 * column and the `subscriptions.plan` check constraint
 * (currently: 'free' | 'pro' | 'business' | 'enterprise').
 *
 * NOTE: the live DB currently has 4 tiers (Free, Pro, Business, Enterprise).
 * The product brief describes 5 tiers (adding "Starter" between Free and Pro).
 * Decide before wiring this into checkout: either (a) add a `starter` row to
 * subscription_plans + extend the plan check constraint, or (b) treat "Pro" as
 * the Starter-equivalent and rename in copy only. This file assumes (a) is not
 * yet done, so STARTER is included but flagged `comingSoon: true` until a DB
 * migration adds it.
 */

export type PlanKey = "free" | "starter" | "pro" | "business" | "enterprise";

export interface PlanLimits {
  companyLimit: number;
  memberLimit: number;
  storageLimitGb: number;
  aiRequestsPerMonth: number;
  invoiceLimitPerMonth: number | null; // null = unlimited
  inventoryItemLimit: number | null;
  payrollEnabled: boolean;
  apiEnabled: boolean;
}

export interface Plan {
  key: PlanKey;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: PlanLimits;
  comingSoon?: boolean;
  highlight?: boolean; // "most popular" badge
}

export const PLANS: Plan[] = [
  {
    key: "free",
    name: "Free",
    slug: "free",
    description: "Get started with the basics for a single company.",
    priceMonthly: 0,
    priceYearly: 0,
    features: ["Invoicing", "Chart of accounts", "1 company", "1 user"],
    limits: {
      companyLimit: 1,
      memberLimit: 1,
      storageLimitGb: 1,
      aiRequestsPerMonth: 0,
      invoiceLimitPerMonth: 20,
      inventoryItemLimit: 25,
      payrollEnabled: false,
      apiEnabled: false,
    },
  },
  {
    key: "starter",
    name: "Starter",
    slug: "starter",
    description: "For solo founders ready to track more than the basics.",
    priceMonthly: 8,
    priceYearly: 80,
    features: ["Everything in Free", "Inventory", "Unlimited invoices", "2 companies"],
    limits: {
      companyLimit: 2,
      memberLimit: 2,
      storageLimitGb: 5,
      aiRequestsPerMonth: 20,
      invoiceLimitPerMonth: null,
      inventoryItemLimit: 250,
      payrollEnabled: false,
      apiEnabled: false,
    },
    comingSoon: true,
  },
  {
    key: "pro",
    name: "Professional",
    slug: "pro",
    description: "Banking and inventory for growing teams.",
    priceMonthly: 15,
    priceYearly: 150,
    features: ["Everything in Starter", "Banking", "5 users", "3 companies"],
    limits: {
      companyLimit: 3,
      memberLimit: 5,
      storageLimitGb: 20,
      aiRequestsPerMonth: 100,
      invoiceLimitPerMonth: null,
      inventoryItemLimit: null,
      payrollEnabled: false,
      apiEnabled: false,
    },
    highlight: true,
  },
  {
    key: "business",
    name: "Business",
    slug: "business",
    description: "Payroll, reporting, and room for a bigger team.",
    priceMonthly: 45,
    priceYearly: 450,
    features: ["Everything in Professional", "Payroll", "Reports", "20 users", "10 companies"],
    limits: {
      companyLimit: 10,
      memberLimit: 20,
      storageLimitGb: 100,
      aiRequestsPerMonth: 500,
      invoiceLimitPerMonth: null,
      inventoryItemLimit: null,
      payrollEnabled: true,
      apiEnabled: true,
    },
  },
  {
    key: "enterprise",
    name: "Enterprise",
    slug: "enterprise",
    description: "Priority support and unlimited scale.",
    priceMonthly: 150,
    priceYearly: 1500,
    features: ["Everything in Business", "Priority support", "API access", "Unlimited companies"],
    limits: {
      companyLimit: 999,
      memberLimit: 999,
      storageLimitGb: 1000,
      aiRequestsPerMonth: 5000,
      invoiceLimitPerMonth: null,
      inventoryItemLimit: null,
      payrollEnabled: true,
      apiEnabled: true,
    },
  },
];

export function getPlan(key: string | null | undefined): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export function isPlanKey(key: string): key is PlanKey {
  return PLANS.some((p) => p.key === key);
}
