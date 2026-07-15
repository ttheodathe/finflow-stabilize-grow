import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/hr/employees")({
  head: () => ({ meta: [{ title: "Employees — Free Accounting" }] }),
  component: () => (
    <ComingSoon
      title="Employees"
      description="Manage your team roster, contracts, and payroll details."
    />
  ),
});
