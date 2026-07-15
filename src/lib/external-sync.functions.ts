import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TABLES = ["customers", "items", "invoices", "invoice_items", "expenses"] as const;

async function runSync() {
  const url = process.env.EXTERNAL_SUPABASE_URL;
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("External Supabase credentials not configured");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { createClient } = await import("@supabase/supabase-js");
  const external = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const results: Record<string, { rows: number; error?: string }> = {};
  for (const table of TABLES) {
    const { data, error } = await supabaseAdmin.from(table).select("*");
    if (error) {
      results[table] = { rows: 0, error: `read: ${error.message}` };
      continue;
    }
    const rows = data ?? [];
    if (rows.length === 0) {
      results[table] = { rows: 0 };
      continue;
    }
    const CHUNK = 500;
    let inserted = 0;
    let firstError: string | undefined;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error: upErr } = await external.from(table).upsert(slice, { onConflict: "id" });
      if (upErr) {
        firstError = firstError ?? `upsert: ${upErr.message}`;
        break;
      }
      inserted += slice.length;
    }
    results[table] = { rows: inserted, error: firstError };
  }
  return { syncedAt: new Date().toISOString(), results };
}

export const runExternalSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => runSync());

export const _internalRunExternalSync = runSync;
