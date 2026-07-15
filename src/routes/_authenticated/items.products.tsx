import { createFileRoute } from "@tanstack/react-router";
import { ItemsManager } from "@/components/items-manager";

export const Route = createFileRoute("/_authenticated/items/products")({
  head: () => ({ meta: [{ title: "Products — Free Accounting" }] }),
  component: () => (
    <ItemsManager
      type="product"
      title="Products"
      description="Manage your product catalog: pricing, tax rates, SKUs and stock."
    />
  ),
});
