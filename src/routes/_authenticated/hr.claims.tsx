import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/hr/claims")({
  head: () => ({ meta: [{ title: "Expense claims — Free Accounting" }] }),
  component: () => (
    <ComingSoon
      title="Expense claims"
      description="Let employees submit reimbursable expenses with receipts attached."
    />
  ),
});
