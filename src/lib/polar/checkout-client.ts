import { supabase } from "@/integrations/supabase/client";

/**
 * Starts a Polar checkout for the signed-in user and redirects the browser to it.
 * The server decides who is paying from the session, so no user id is sent.
 * Throws with a readable message if the checkout cannot be created.
 */
export async function startPolarCheckout(opts: { productId: string; companyId: string }) {
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
  // Full navigation: leaves the app for the Polar-hosted checkout page.
  window.location.href = json.url;
}
