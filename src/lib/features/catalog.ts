/**
 * Feature catalog — single source of truth for plan-based gating.
 *
 * Mirrors the tiers advertised on /pricing (see PLANS in
 * src/lib/paddle/config.ts). To gate a new module: add a FeatureDef here
 * and map its route(s) in ROUTE_FEATURES. Everything else (sidebar,
 * dashboard launcher, upgrade prompts) picks it up automatically.
 *
 * Client-side gating is UX only — every mutating server fn must re-check.
 */
import { PLANS, PLAN_ORDER, normalizePlan, type PlanKey } from "@/lib/paddle/config";

export type FeatureKey =
  | "invoices"
  | "recurringInvoices"
  | "creditNotes"
  | "bills"
  | "purchaseOrders"
  | "inventory"
  | "warehouses"
  | "bankReconciliation"
  | "basicReports"
  | "advancedReports"
  | "accounting"
  | "tax"
  | "hr"
  | "payroll"
  | "aiBookkeeper"
  | "documentAi"
  | "apiAccess";

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  /** Lowest plan (by PLAN_ORDER rank) that unlocks this feature. */
  minPlan: PlanKey;
}

export const FEATURES: Record<FeatureKey, FeatureDef> = {
  invoices: { key: "invoices", label: "Invoicing", minPlan: "free" },
  bills: { key: "bills", label: "Bills", minPlan: "free" },
  basicReports: { key: "basicReports", label: "Basic reports", minPlan: "free" },
  recurringInvoices: { key: "recurringInvoices", label: "Recurring invoices", minPlan: "pro" },
  creditNotes: { key: "creditNotes", label: "Credit notes", minPlan: "pro" },
  purchaseOrders: { key: "purchaseOrders", label: "Purchase orders", minPlan: "pro" },
  inventory: { key: "inventory", label: "Inventory management", minPlan: "pro" },
  warehouses: { key: "warehouses", label: "Warehouses", minPlan: "pro" },
  bankReconciliation: { key: "bankReconciliation", label: "Bank reconciliation", minPlan: "pro" },
  advancedReports: { key: "advancedReports", label: "Advanced reports", minPlan: "pro" },
  accounting: { key: "accounting", label: "Accounting & balance sheet", minPlan: "pro" },
  tax: { key: "tax", label: "Tax management", minPlan: "pro" },
  aiBookkeeper: { key: "aiBookkeeper", label: "AI Bookkeeper & OCR", minPlan: "pro" },
  documentAi: { key: "documentAi", label: "OCR & AI document scanning", minPlan: "pro" },
  hr: { key: "hr", label: "HR", minPlan: "business" },
  payroll: { key: "payroll", label: "Payroll", minPlan: "business" },
  apiAccess: { key: "apiAccess", label: "API access", minPlan: "business" },
};

/**
 * Route → feature mapping. Longest matching prefix wins, so a parent
 * path can stay free while a child path is gated.
 */
export const ROUTE_FEATURES: Record<string, FeatureKey> = {
  "/items/inventory": "inventory",
  "/items/warehouses": "warehouses",
  "/items/stock-movements": "inventory",
  "/sales/recurring": "recurringInvoices",
  "/sales/credit-notes": "creditNotes",
  "/purchases/orders": "purchaseOrders",
  "/banking/reconciliations": "bankReconciliation",
  "/accounting": "accounting",
  "/tax": "tax",
  "/hr": "hr",
  "/payroll": "payroll",
  "/ai-bookkeeper": "aiBookkeeper",
};

const rank = (plan: PlanKey | string | null | undefined) => {
  const idx = PLAN_ORDER.indexOf(normalizePlan(plan as string));
  return idx === -1 ? 0 : idx;
};

export function planHasFeature(plan: PlanKey, key: FeatureKey): boolean {
  return rank(plan) >= rank(FEATURES[key].minPlan);
}

export function requiredPlanFor(key: FeatureKey): PlanKey {
  return FEATURES[key].minPlan;
}

export function requiredPlanName(key: FeatureKey): string {
  return PLANS[requiredPlanFor(key)].name;
}

/** Resolve the feature gating a given route path, if any. */
export function featureForRoute(path: string): FeatureKey | null {
  let match: { prefix: string; key: FeatureKey } | null = null;
  for (const [prefix, key] of Object.entries(ROUTE_FEATURES)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      if (!match || prefix.length > match.prefix.length) match = { prefix, key };
    }
  }
  return match?.key ?? null;
}