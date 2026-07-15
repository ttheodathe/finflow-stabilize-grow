import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/payroll/pay-runs")({
  head: () => ({ meta: [{ title: "Pay Runs — Free Accounting" }] }),
  component: PayRuns,
});

function PayRuns() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pay Runs</h1>
        <p className="text-muted-foreground">Manage and process employee pay runs.</p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Pay runs feature coming soon.</p>
      </div>
    </div>
  );
}
