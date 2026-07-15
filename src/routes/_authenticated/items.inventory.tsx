import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
export const Route = createFileRoute("/_authenticated/items/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Free Accounting" }] }),
  component: () => (
    <ComingSoon
      title="Inventory"
      description="Real-time stock tracking across warehouses with low-stock alerts and automatic COGS."
      items={["Stock levels", "Warehouses", "Low-stock alerts", "Adjustments"]}
    />
  ),
});
