import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/hr/departments")({
  head: () => ({ meta: [{ title: "Departments — Free Accounting" }] }),
  component: () => (
    <ComingSoon title="Departments" description="Organize teams and report on cost centers." />
  ),
});
