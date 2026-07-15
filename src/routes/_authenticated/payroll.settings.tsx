import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/payroll/settings")({
  head: () => ({ meta: [{ title: "Payroll Settings — Free Accounting" }] }),
  component: PayrollSettings,
});

function PayrollSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payroll Settings</h1>
        <p className="text-muted-foreground">Configure payroll settings and tax information.</p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Payroll settings coming soon.</p>
      </div>
    </div>
  );
}
