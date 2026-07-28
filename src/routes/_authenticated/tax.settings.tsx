import { createFileRoute } from "@tanstack/react-router";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { usePermissions } from "@/hooks/usePermissions";
import { TaxRatesEditor } from "@/components/tax/TaxRatesEditor";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/tax/settings")({
  head: () => ({ meta: [{ title: "Tax Settings — Free Accounting" }] }),
  component: TaxSettingsPage,
});

function TaxSettingsPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const { can } = usePermissions(companyId);
  const { settings, isLoading, saveTaxSetting, deleteTaxSetting } = useTaxSettings(companyId);

  if (!companyId) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Tax settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage the tax rates and jurisdictions this company files under.
        </p>
      </div>

      <TaxRatesEditor
        companyId={companyId}
        settings={settings}
        isLoading={isLoading}
        onSave={saveTaxSetting}
        onDelete={deleteTaxSetting}
        canManage={can("tax.manage_settings")}
      />
    </div>
  );
}
