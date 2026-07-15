import { useEffect, useState, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkspaceSettings {
  userId: string;
  workspaceName: string;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  invoicePrefix: string;
  invoiceNextNumber: number;
  defaultPaymentTermsDays: number;
  defaultInvoiceNotes: string | null;
  notifyPaymentReceived: boolean;
  notifyInvoiceOverdue: boolean;
  notifyWeeklySummary: boolean;
  theme: "light" | "dark" | "system";
}

type SettingsUpdate = Partial<Omit<WorkspaceSettings, "userId">>;

interface UseSettingsResult {
  loading: boolean;
  saving: boolean;
  error: string | null;
  settings: WorkspaceSettings | null;
  updateSettings: (patch: SettingsUpdate) => Promise<{ success: boolean; error?: string }>;
}

function fromRow(row: any): WorkspaceSettings {
  return {
    userId: row.user_id,
    workspaceName: row.workspace_name,
    logoUrl: row.logo_url,
    currency: row.currency,
    timezone: row.timezone,
    dateFormat: row.date_format,
    invoicePrefix: row.invoice_prefix,
    invoiceNextNumber: row.invoice_next_number,
    defaultPaymentTermsDays: row.default_payment_terms_days,
    defaultInvoiceNotes: row.default_invoice_notes,
    notifyPaymentReceived: row.notify_payment_received,
    notifyInvoiceOverdue: row.notify_invoice_overdue,
    notifyWeeklySummary: row.notify_weekly_summary,
    theme: row.theme,
  };
}

function toRow(patch: SettingsUpdate): Record<string, unknown> {
  const map: Record<keyof SettingsUpdate, string> = {
    workspaceName: "workspace_name",
    logoUrl: "logo_url",
    currency: "currency",
    timezone: "timezone",
    dateFormat: "date_format",
    invoicePrefix: "invoice_prefix",
    invoiceNextNumber: "invoice_next_number",
    defaultPaymentTermsDays: "default_payment_terms_days",
    defaultInvoiceNotes: "default_invoice_notes",
    notifyPaymentReceived: "notify_payment_received",
    notifyInvoiceOverdue: "notify_invoice_overdue",
    notifyWeeklySummary: "notify_weekly_summary",
    theme: "theme",
  };
  const row: Record<string, unknown> = {};
  for (const key in patch) {
    const typedKey = key as keyof SettingsUpdate;
    // @ts-ignore - dynamic mapping
    row[map[typedKey]] = patch[typedKey];
  }
  return row;
}

/**
 * Loads and updates the current user's workspace settings.
 * Expects `supabase` to be an already-authenticated client and `userId` to
 * be the logged-in user's id.
 */
export function useSettings(supabase: SupabaseClient, userId: string | null): UseSettingsResult {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data, error: fetchError } = await supabase
        .from("workspace_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      // Row should exist via the auto-create trigger, but fall back to
      // inserting one client-side in case this user predates the migration
      // and the backfill somehow missed them.
      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from("workspace_settings")
          .insert({ user_id: userId })
          .select("*")
          .single();

        if (cancelled) return;

        if (insertError) {
          setError(insertError.message);
          setLoading(false);
          return;
        }
        setSettings(fromRow(created));
      } else {
        setSettings(fromRow(data));
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, userId]);

  const updateSettings = useCallback(
    async (patch: SettingsUpdate) => {
      if (!userId) return { success: false, error: "Not signed in" };

      setSaving(true);
      setError(null);

      // Optimistic update.
      setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

      const { data, error: updateError } = await supabase
        .from("workspace_settings")
        .update(toRow(patch))
        .eq("user_id", userId)
        .select("*")
        .single();

      setSaving(false);

      if (updateError) {
        setError(updateError.message);
        return { success: false, error: updateError.message };
      }

      setSettings(fromRow(data));
      return { success: true };
    },
    [supabase, userId],
  );

  return { loading, saving, error, settings, updateSettings };
}
