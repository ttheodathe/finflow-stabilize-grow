import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/hr/leave")({
  head: () => ({ meta: [{ title: "Leave management — Free Accounting" }] }),
  component: () => (
    <ComingSoon
      title="Leave management"
      description="Track PTO, sick days, and holidays with approval workflows."
    />
  ),
});
