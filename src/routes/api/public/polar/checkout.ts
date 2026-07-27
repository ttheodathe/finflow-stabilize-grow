import { createFileRoute } from "@tanstack/react-router";
import { polar } from "@/lib/polar/server";

export const Route = createFileRoute("/api/public/polar/checkout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const productId = url.searchParams.get("productId");
        const companyId = url.searchParams.get("companyId");
        const userId = url.searchParams.get("userId");

        if (!productId) return new Response("Missing productId", { status: 400 });

        try {
         const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${url.origin}/settings?tab=billing`,
            metadata: { company_id: companyId ?? "", user_id: userId ?? "" },
          });
          return Response.redirect(checkout.url, 302);
        } catch (err) {
          console.error("[polar-checkout] creation failed:", err);
          return new Response("Checkout creation failed", { status: 500 });
        }
      },
    },
  },
});
