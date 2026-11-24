export const PENDING_POLAR_CHECKOUT_KEY = "finflow_ga4_pending_polar_checkout_v1";

export const POLAR_CHECKOUT_POLL_INTERVAL_MS = 5_000;
export const POLAR_CHECKOUT_POLL_WINDOW_MS = 120_000;
export const POLAR_CHECKOUT_MARKER_TTL_MS = 24 * 60 * 60 * 1000;

export type AttributedPolarPurchase = {
  orderId: string;
  createdAt: number;
  currency: string;
  value: number;
  tax: number;
  billingReason: string | null;
  productId: string | null;
};

type PendingCheckoutMarker = {
  startedAt?: unknown;
};

/**
 * Reads the browser-local checkout marker without exposing it to analytics.
 * Invalid, future-dated, or older-than-one-day markers are treated as absent.
 */
export function getPendingPolarCheckoutStartedAt(
  rawMarker: string | null,
  now = Date.now(),
): number | null {
  if (!rawMarker) return null;

  try {
    const marker = JSON.parse(rawMarker) as PendingCheckoutMarker;
    const startedAt = Number(marker?.startedAt);
    const age = now - startedAt;
    if (
      !Number.isFinite(startedAt) ||
      startedAt <= 0 ||
      age < -60_000 ||
      age > POLAR_CHECKOUT_MARKER_TTL_MS
    ) {
      return null;
    }
    return startedAt;
  } catch {
    return null;
  }
}

export function hasRecentPolarCheckout(
  rawMarker: string | null,
  now = Date.now(),
): boolean {
  const startedAt = getPendingPolarCheckoutStartedAt(rawMarker, now);
  if (startedAt === null) return false;
  const age = now - startedAt;
  return age >= 0 && age < POLAR_CHECKOUT_POLL_WINDOW_MS;
}

/**
 * Maps only a provider-confirmed paid order for the subscription and checkout
 * currently being completed. Polar amounts are in cents; GA4 values are in
 * major currency units and exclude tax.
 */
export function getAttributedPolarPurchase(
  order: Record<string, unknown>,
  options: {
    subscriptionId: string;
    checkoutStartedAt: number;
    now?: number;
  },
): AttributedPolarPurchase | null {
  const now = options.now ?? Date.now();
  const orderId = typeof order.id === "string" ? order.id : "";
  const createdAt = Date.parse(String(order.created_at ?? ""));
  const paid = order.paid === true || order.status === "paid";
  const sameSubscription = order.subscription_id === options.subscriptionId;
  const currency = String(order.currency ?? "").toUpperCase();
  const taxAmountCents = Number(order.tax_amount ?? 0);
  const netAmountCents =
    order.net_amount !== null && order.net_amount !== undefined
      ? Number(order.net_amount)
      : Number(order.total_amount) - taxAmountCents;

  if (
    !orderId ||
    !options.subscriptionId ||
    !sameSubscription ||
    !paid ||
    !Number.isFinite(createdAt) ||
    createdAt < options.checkoutStartedAt - 60_000 ||
    createdAt > now + 60_000 ||
    !/^[A-Z]{3}$/.test(currency) ||
    !Number.isInteger(netAmountCents) ||
    netAmountCents <= 0 ||
    !Number.isFinite(taxAmountCents) ||
    taxAmountCents < 0
  ) {
    return null;
  }

  return {
    orderId,
    createdAt,
    currency,
    value: netAmountCents / 100,
    tax: taxAmountCents / 100,
    billingReason:
      typeof order.billing_reason === "string" ? order.billing_reason : null,
    productId: typeof order.product_id === "string" ? order.product_id : null,
  };
}
