import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fix (Jennifer QA — Journal Entry: "Currency symbol does not change even
 * after updating the Settings" / New Expense: "Currency-USD is the default,
 * regardless of Settings"):
 *
 * Previously this hook read `profiles.default_currency`, a completely
 * different column from the one the Settings page (Workspace tab) actually
 * writes to (`workspace_settings.currency`). Updating Settings never
 * touched `profiles`, so every screen using `useDefaultCurrency()` kept
 * showing the old currency forever. This hook now reads/writes
 * `workspace_settings`, the same table Settings uses, and `useSettings.ts`
 * pushes updates into the cache below the moment Settings is saved so every
 * open screen updates immediately without a reload.
 */

type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

let currencyCached: string | null = null;
let dateFormatCached: DateFormat | null = null;
const currencyListeners = new Set<(c: string) => void>();
const dateFormatListeners = new Set<(f: DateFormat) => void>();

let loadPromise: Promise<void> | null = null;

async function loadWorkspaceSettings() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data } = await supabase
    .from("workspace_settings")
    .select("currency,date_format")
    .eq("user_id", u.user.id)
    .maybeSingle();
  setDefaultCurrency((data?.currency as string) || "USD");
  setDefaultDateFormat((data?.date_format as DateFormat) || "MM/DD/YYYY");
}

export function setDefaultCurrency(code: string) {
  currencyCached = code;
  currencyListeners.forEach((fn) => fn(code));
}

export function setDefaultDateFormat(format: DateFormat) {
  dateFormatCached = format;
  dateFormatListeners.forEach((fn) => fn(format));
}

export function useDefaultCurrency() {
  const [currency, setCurrency] = useState<string>(currencyCached ?? "USD");

  useEffect(() => {
    const listener = (c: string) => setCurrency(c);
    currencyListeners.add(listener);
    if (currencyCached === null) {
      loadPromise ??= loadWorkspaceSettings();
    }
    return () => {
      currencyListeners.delete(listener);
    };
  }, []);

  return currency;
}

export function useDateFormat(): DateFormat {
  const [format, setFormat] = useState<DateFormat>(dateFormatCached ?? "MM/DD/YYYY");

  useEffect(() => {
    const listener = (f: DateFormat) => setFormat(f);
    dateFormatListeners.add(listener);
    if (dateFormatCached === null) {
      loadPromise ??= loadWorkspaceSettings();
    }
    return () => {
      dateFormatListeners.delete(listener);
    };
  }, []);

  return format;
}

/**
 * Formats an ISO ("YYYY-MM-DD") date string according to the workspace's
 * configured date format. Falls back gracefully on invalid input.
 */
export function formatDate(value: string | null | undefined, format: DateFormat): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const [, yyyy, mm, dd] = m;
  switch (format) {
    case "DD/MM/YYYY":
      return `${dd}/${mm}/${yyyy}`;
    case "YYYY-MM-DD":
      return `${yyyy}-${mm}-${dd}`;
    case "MM/DD/YYYY":
    default:
      return `${mm}/${dd}/${yyyy}`;
  }
}
