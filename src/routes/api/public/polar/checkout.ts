import { createFileRoute } from "@tanstack/react-router";
import { POLAR_PRODUCTS } from "@/lib/polar/config";

// SECURITY: this used to be a public GET that trusted userId/companyId from the web address, so
// anyone could start a checkout that attaches a subscription to somebody else's account. It now
// needs a signed-in session: the user id comes from the verified session (never from the request),
// the caller must be an owner or admin of the company, and only our own Polar products are
// accepted. The browser receives the Polar checkout URL and redirects to it.
const ALLOWED_PRODUCT_IDS = new Set<string>(
  Object.values(POLAR_PRODUCTS).flatMap((p) => Object.values(p)),
);

export const Route = createFileRoute("/api/public/polar/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { authenticate, getActiveRoleKey } = await import("@/lib/api-auth.server");
          const caller = await authenticate(request);
          if (caller instanceof Response) return caller;

          const body = await request.json().catch(() => ({}));
          const productId = typeof body?.productId === "string" ? body.productId : "";
          const companyId = typeof body?.companyId === "string" ? body.companyId : "";

          if (!ALLOWED_PRODUCT_IDS.has(productId)) {
            return Response.json({ error: "Unknown plan" }, { status: 400 });
          }
          if (!companyId) {
            return Response.json({ error: "Select or create a company first" }, { status: 400 });
          }

          const role = await getActiveRoleKey(caller.admin, caller.userId, companyId);
          if (role !== "owner" && role !== "admin") {
            return Response.json(
              { error: "Only a company owner or admin can change the plan" },
              { status: 403 },
            );
          }

          const { polar } = await import("@/lib/polar/server");
          const origin = new URL(request.url).origin;
          const checkout = await polar.checkouts.create({
            products: [productId],
            successUrl: `${origin}/settings?tab=billing`,
            metadata: { company_id: companyId, user_id: caller.userId },
          });
          return Response.json({ url: checkout.url });
        } catch (err) {
          console.error("[polar-checkout] creation failed:", err);
          return Response.json({ error: "Checkout creation failed" }, { status: 500 });
        }
      },
    },
  },
});
