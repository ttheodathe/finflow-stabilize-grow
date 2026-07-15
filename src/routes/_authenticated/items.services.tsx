import { createFileRoute } from "@tanstack/react-router";
import { ItemsManager } from "@/components/items-manager";

export const Route = createFileRoute("/_authenticated/items/services")({
  head: () => ({ meta: [{ title: "Services — Free Accounting" }] }),
  component: () => (
    <ItemsManager
      type="service"
      title="Services"
      description="Billable services, rates and tax — ready to drop into invoices."
    />
  ),
});
