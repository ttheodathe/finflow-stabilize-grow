import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/payroll/payslips")({
  head: () => ({ meta: [{ title: "Payslips — Free Accounting" }] }),
  component: Payslips,
});

function Payslips() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payslips</h1>
        <p className="text-muted-foreground">View and manage employee payslips.</p>
      </div>

      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Payslips feature coming soon.</p>
      </div>
    </div>
  );
}
