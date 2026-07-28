import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useTaxReturns } from "@/hooks/useTaxReturns";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { useDefaultCurrency } from "@/hooks/use-currency";
import { TaxReturnsTable } from "@/components/tax/TaxReturnsTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { generatePeriodsForYear, type GeneratedPeriod } from "@/lib/tax/taxPeriods";

export const Route = createFileRoute("/_authenticated/tax/returns")({
  head: () => ({ meta: [{ title: "Tax Returns — Free Accounting" }] }),
  component: TaxReturnsPage,
});

function TaxReturnsPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const navigate = useNavigate();
  const currency = useDefaultCurrency();
  const { can } = usePermissions(companyId);

  const { returns, isLoading, createReturn, isCreating } = useTaxReturns(companyId);
  const { settings, isLoading: settingsLoading } = useTaxSettings(companyId);

  const [open, setOpen] = useState(false);
  const [settingId, setSettingId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<GeneratedPeriod | null>(null);

  const activeSettings = settings.filter((s) => s.is_active);
  const selectedSetting = activeSettings.find((s) => s.id === settingId);
  // TODO: pull fiscalYearStartMonth from company_settings.fiscal_year_start_month
  // once a useCompanySettings() hook exists; defaulting to January for now.
  const periodOptions = selectedSetting
    ? generatePeriodsForYear(new Date().getFullYear(), 1, selectedSetting.filing_frequency, 15)
    : [];

  async function handleCreate() {
    if (!selectedSetting || !selectedPeriod) {
      toast.error("Choose a tax rate and period first");
      return;
    }
    try {
      const created = await createReturn({
        taxSetting: selectedSetting,
        periodStart: selectedPeriod.period_start,
        periodEnd: selectedPeriod.period_end,
        dueDate: selectedPeriod.due_date,
      });
      toast.success("Draft return created");
      setOpen(false);
      navigate({ to: "/tax/returns/$returnId", params: { returnId: created.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create return");
    }
  }

  if (!companyId) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Filing history</h1>
          <p className="text-sm text-muted-foreground">Draft, review, and submit tax returns.</p>
        </div>

        {can("tax.file") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={settingsLoading || activeSettings.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                New return
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a tax return</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Tax rate</Label>
                  <Select value={settingId} onValueChange={setSettingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSettings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.rate}%, {s.filing_frequency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSetting && (
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Select
                      value={selectedPeriod?.period_start ?? ""}
                      onValueChange={(v) =>
                        setSelectedPeriod(periodOptions.find((p) => p.period_start === v) ?? null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a period" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOptions.map((p) => (
                          <SelectItem key={p.period_start} value={p.period_start}>
                            {new Date(p.period_start).toLocaleDateString()} –{" "}
                            {new Date(p.period_end).toLocaleDateString()} (due{" "}
                            {new Date(p.due_date).toLocaleDateString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                  {isCreating ? "Creating..." : "Create draft return"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  We'll pull invoices, bills, and expenses for this period automatically. You can
                  review everything before filing.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <TaxReturnsTable returns={returns} isLoading={isLoading} currency={currency} />
    </div>
  );
}
