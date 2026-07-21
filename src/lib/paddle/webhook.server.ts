/**
 * Paddle Billing webhook signature verification + event processing.
 * Server-only (never imported from client).
 *
 * Paddle sends a `Paddle-Signature` header of the form:
 *   ts=<unix_ts>;h1=<hex_hmac_sha256>
 * where the HMAC is computed over `${ts}:${rawBody}` using the endpoint's
 * webhook secret. See https://developer.paddle.com/webhooks/signature-verification
 */
import { createHmac, timingSafeEqual } from "crypto";
import { planFromPriceId, type PlanKey, type BillingCycle } from "./config";

export interface VerifiedWebhook {
  ok: true;
  event: PaddleEvent;
}

export type VerifyResult = VerifiedWebhook | { ok: false; error: string; status: number };

export interface PaddleEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 60 * 5,
): VerifyResult {
  if (!signatureHeader) return { ok: false, error: "Missing Paddle-Signature header", status: 400 };
  if (!secret) return { ok: false, error: "PADDLE_WEBHOOK_SECRET not configured", status: 500 };

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => {
      const [k, ...rest] = p.split("=");
      return [k?.trim(), rest.join("=")?.trim()];
    }),
  ) as Record<string, string>;

  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return { ok: false, error: "Malformed Paddle-Signature header", status: 400 };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, error: "Invalid timestamp", status: 400 };
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > toleranceSeconds) {
    return { ok: false, error: "Signature timestamp outside tolerance", status: 400 };
  }

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const a = Buffer.from(h1, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Invalid signature", status: 401 };
  }

  let event: PaddleEvent;
  try {
    event = JSON.parse(rawBody) as PaddleEvent;
  } catch {
    return { ok: false, error: "Invalid JSON body", status: 400 };
  }
  if (!event.event_id || !event.event_type) {
    return { ok: false, error: "Missing event_id or event_type", status: 400 };
  }
  return { ok: true, event };
}

/**
 * Normalize a subscription payload from Paddle into the shape stored in
 * the `subscriptions` table.
 */
export function normalizeSubscription(data: Record<string, unknown>): {
  paddle_subscription_id: string;
  paddle_customer_id: string | null;
  price_id: string | null;
  plan: PlanKey;
  billing_cycle: BillingCycle | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  custom_data: Record<string, unknown> | null;
} {
  const items = (data.items as Array<Record<string, unknown>> | undefined) ?? [];
  const firstPrice = items[0]?.price as Record<string, unknown> | undefined;
  const priceId =
    (firstPrice?.id as string | undefined) ??
    ((items[0]?.price_id as string | undefined) ?? null);
  const mapped = priceId ? planFromPriceId(priceId) : null;
  const currentPeriod = data.current_billing_period as
    | { starts_at?: string; ends_at?: string }
    | undefined;
  const scheduledChange = data.scheduled_change as
    | { action?: string; effective_at?: string }
    | undefined;

  const custom = (data.custom_data as Record<string, unknown> | null) ?? null;
  const customPlan = custom?.plan as PlanKey | undefined;
  const customCycle = custom?.cycle as BillingCycle | undefined;

  return {
    paddle_subscription_id: String(data.id),
    paddle_customer_id: (data.customer_id as string | null) ?? null,
    price_id: priceId,
    plan: mapped?.plan ?? customPlan ?? "free",
    billing_cycle: mapped?.cycle ?? customCycle ?? null,
    status: (data.status as string) ?? "unknown",
    current_period_start: currentPeriod?.starts_at ?? null,
    current_period_end: currentPeriod?.ends_at ?? null,
    cancel_at_period_end: scheduledChange?.action === "cancel",
    custom_data: custom,
  };
}