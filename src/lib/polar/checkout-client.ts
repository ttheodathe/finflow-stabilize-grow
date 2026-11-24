import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { PENDING_POLAR_CHECKOUT_KEY } from "@/lib/polar-analytics-attribution";
import { PLANS, type BillingCycle } from "@/lib/paddle/config";

/**
 * Starts a Polar checkout for the signed-in user and redirects the browser to it.
 * The server decides who is paying from the session, so no user id is sent.
 * Throws with a readable message if the checkout cannot be created.
 */
export async function startPolarCheckout(opts: {
  productId: string;
  companyId: string;
  plan: "pro" | "business";
  cycle: BillingCycle;
}) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");

  const res = await fetch("/api/public/polar/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(opts),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || typeof json?.url !== "string") {
    throw new Error(json?.error ?? "Checkout could not be started");
  }
  // Remember when this checkout started so the return page only counts
  // genuinely new, paid Polar orders — never historical orders or checkout clicks.
  try {
    localStorage.setItem(PENDING_POLAR_CHECKOUT_KEY, JSON.stringify({ startedAt: Date.now() }));
  } catch {
    // Analytics is best-effort and must never block a valid checkout.
  }
  const planConfig = PLANS[opts.plan];
  const checkoutValue =
    (opts.cycle === "yearly" ? planConfig.priceYearly : planConfig.priceMonthly) ?? 0;

  trackEvent("begin_checkout", {
    checkout_provider: "polar",
    currency: "USD",
    value: checkoutValue,
    items: [
      {
        item_id: opts.productId,
        item_name: `FinFlow Track ${planConfig.name} ${opts.cycle} subscription`,
        item_category: "subscription",
        price: checkoutValue,
        quantity: 1,
      },
    ],
  });

  // Full navigation: leaves the app for the Polar-hosted checkout page.
  window.location.href = json.url;
}
