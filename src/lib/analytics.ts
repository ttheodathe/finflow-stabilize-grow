import { supabase } from "@/integrations/supabase/client";

type AnalyticsParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Send privacy-conscious product events through the site's existing GA4 setup.
 * Never pass names, email addresses, record IDs, amounts, or other financial data.
 */
export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

/**
 * Record a successful accounting action and identify the first meaningful
 * accounting action for a company. Counts are queried after the write succeeds;
 * only the action type is sent to analytics, never financial record data.
 */
export async function trackAccountingAction(
  companyId: string,
  action: "invoice" | "expense",
) {
  trackEvent(action === "invoice" ? "invoice_created" : "expense_created");

  try {
    const [invoices, expenses] = await Promise.all([
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
      supabase
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId),
    ]);

    if (invoices.error || expenses.error) return;
    if ((invoices.count ?? 0) + (expenses.count ?? 0) === 1) {
      trackEvent("first_value_action_completed", { action_type: action });
    }
  } catch (error) {
    // Analytics must never interrupt a successful accounting workflow.
    console.warn("[analytics] Could not determine first accounting action:", error);
  }
}
