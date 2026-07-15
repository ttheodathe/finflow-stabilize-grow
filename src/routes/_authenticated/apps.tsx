import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/apps")({
  head: () => ({ meta: [{ title: "Apps marketplace — Free Accounting" }] }),
  component: () => (
    <ComingSoon
      title="Apps marketplace"
      description="Extend Free Accounting with payments, payroll, CRM, e-commerce, and tax integrations."
      items={["Stripe", "PayPal", "Shopify", "Slack", "Google Drive", "Zapier"]}
    />
  ),
});
