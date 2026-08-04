/**
 * Polar webhook signature verification.
 * Server-only. Mirrors src/lib/paddle/webhook.server.ts.
 */
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { planFromPolarProductId } from "./config";
import type { PlanKey, BillingCycle } from "@/lib/paddle/config";

export type VerifyResult =
  | { ok: true; event: { type: string; data: Record<string, unknown> } }
  | { ok: false; error: string; status: number };

export function verifyPolarSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
): VerifyResult {
  try {
    const event = validateEvent(
      rawBody,
      Object.fromEntries(headers.entries()),
      secret,
    );
    return { ok: true, event: event as { type: string; data: Record<string, unknown> } };
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return { ok: false, error: "Invalid signature", status: 403 };
    }
    return { ok: false, error: "Malformed webhook payload", status: 400 };
  }
}

export function normalizePolarSubscription(data: Record<string, unknown>): {
  polar_subscription_id: string;
  polar_customer_id: string | null;
  price_id: string | null;
  plan: PlanKey;
  billing_cycle: BillingCycle | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  custom_data: Record<string, unknown> | null;
} {
  // Polar's actual webhook payload uses camelCase (productId, customerId,
  // currentPeriodStart/End, cancelAtPeriodEnd) — confirmed against real
  // logged events in billing_events. The previous snake_case reads
  // (product_id, customer_id, ...) were always undefined, which is why
  // every paid subscription silently recorded plan="free" with null
  // customer/period data regardless of what was actually purchased.
  const productId = (data.productId as string | undefined) ?? null;
  const mapped = productId ? planFromPolarProductId(productId) : null;
  const custom = (data.metadata as Record<string, unknown> | null) ?? null;

  return {
    polar_subscription_id: String(data.id),
    polar_customer_id: (data.customerId as string | null) ?? null,
    price_id: productId,
    plan: mapped?.plan ?? (custom?.plan as PlanKey | undefined) ?? "free",
    billing_cycle: mapped?.cycle ?? (custom?.cycle as BillingCycle | undefined) ?? null,
    status: (data.status as string) ?? "unknown",
    current_period_start: (data.currentPeriodStart as string) ?? null,
    current_period_end: (data.currentPeriodEnd as string) ?? null,
    cancel_at_period_end: Boolean(data.cancelAtPeriodEnd),
    custom_data: custom,
  };
}
