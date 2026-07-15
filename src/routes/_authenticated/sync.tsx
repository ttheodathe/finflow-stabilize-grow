import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runExternalSync } from "@/lib/external-sync.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sync")({
  head: () => ({ meta: [{ title: "External Sync — Free Accounting" }] }),
  component: SyncPage,
});

type Result = { syncedAt: string; results: Record<string, { rows: number; error?: string }> };

function SyncPage() {
  const fn = useServerFn(runExternalSync);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Result | null>(null);

  async function trigger() {
    setBusy(true);
    const t = toast.loading("Mirroring data to your external Supabase…");
    try {
      const r = (await fn()) as Result;
      setLast(r);
      toast.success("Sync complete", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed", { id: t });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">External Supabase Sync</h1>
          <p className="text-sm text-muted-foreground">
            Mirrors customers, items, invoices, invoice items, and expenses to your external
            Supabase project.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual sync</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={trigger} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync now
          </Button>
          {last && (
            <div className="text-sm border rounded-lg divide-y">
              <div className="px-3 py-2 text-muted-foreground">
                Last sync: {new Date(last.syncedAt).toLocaleString()}
              </div>
              {Object.entries(last.results).map(([table, r]) => (
                <div key={table} className="px-3 py-2 flex justify-between">
                  <span className="font-mono">{table}</span>
                  <span className={r.error ? "text-destructive" : "text-muted-foreground"}>
                    {r.error ? r.error : `${r.rows} rows`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Background sync also runs automatically every 15 minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
