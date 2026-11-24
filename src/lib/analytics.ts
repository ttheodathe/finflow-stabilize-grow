import { supabase } from "@/integrations/supabase/client";

type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue | Array<Record<string, AnalyticsValue>>>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Send privacy-conscious product events through the site's existing GA4 setup.
 * Never pass names, email addresses, account IDs, or other personal information.
 * Returns false when the GA4 queue is unavailable so callers can safely retry.
 */
export function trackEvent(eventName: string, params: AnalyticsParams = {}): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  window.gtag("event", eventName, params);
  return true;
}

/**
 * Send a one-time event in this browser. The dedupe key stays local and is not
 * included in the GA4 payload. This is used for lifecycle milestones that
 * should not repeat when a user reloads a page.
 */
export function trackEventOnce(
  eventName: string,
  dedupeKey: string,
  params: AnalyticsParams = {},
): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = `finflow_ga4_once:${eventName}:${dedupeKey}`;
  try {
    if (window.localStorage.getItem(storageKey) === "1") return true;
  } catch {
    // Continue without browser-level deduplication when storage is unavailable.
  }

  if (!trackEvent(eventName, params)) return false;
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // The event was queued successfully; storage is only a best-effort safeguard.
  }
  return true;
}

/**
 * Record a successful accounting action and identify the first meaningful
 * accounting action for a company. Counts are queried after the write succeeds;
 * only the action type is sent to analytics, never financial record data.
 */
export async function trackAccountingAction(companyId: string, action: "invoice" | "expense") {
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
