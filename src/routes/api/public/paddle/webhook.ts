import { createFileRoute } from "@tanstack/react-router";
import { verifyPaddleSignature, normalizeSubscription } from "@/lib/paddle/webhook.server";

export const Route = createFileRoute("/api/public/paddle/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PADDLE_WEBHOOK_SECRET;
        const signature = request.headers.get("paddle-signature");
        const rawBody = await request.text();

        const verified = verifyPaddleSignature(rawBody, signature, secret ?? "");
        if (!verified.ok) {
          console.warn("[paddle-webhook] rejected:", verified.error);
          return new Response(verified.error, { status: verified.status });
        }
        const { event } = verified;

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: schema types don't yet include billing tables
        const supabaseAdmin = _admin as any;

        // Idempotency: unique paddle_event_id short-circuits duplicates.
        const insertEvent = await supabaseAdmin
          .from("billing_events")
          .insert({
            paddle_event_id: event.event_id,
            event_type: event.event_type,
            payload: event,
            processed: false,
          })
          .select("id")
          .maybeSingle();

        if (insertEvent.error) {
          // 23505 = unique_violation → already processed; ack.
          const code = (insertEvent.error as { code?: string }).code;
          if (code === "23505") return new Response("ok (duplicate)", { status: 200 });
          console.error("[paddle-webhook] insert event failed:", insertEvent.error);
          return new Response("Server error", { status: 500 });
        }

        try {
          await handleEvent(event, supabaseAdmin);
          await supabaseAdmin
            .from("billing_events")
            .update({ processed: true })
            .eq("paddle_event_id", event.event_id);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[paddle-webhook] handler failed:", msg);
          await supabaseAdmin
            .from("billing_events")
            .update({ processed: false, error: msg })
            .eq("paddle_event_id", event.event_id);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

// biome-ignore lint/suspicious/noExplicitAny: admin client typed loosely
async function handleEvent(event: { event_type: string; data: Record<string, unknown> }, admin: any) {
  const t = event.event_type;

  if (
    t === "subscription.created" ||
    t === "subscription.updated" ||
    t === "subscription.activated" ||
    t === "subscription.resumed" ||
    t === "subscription.paused" ||
    t === "subscription.canceled"
  ) {
    const sub = normalizeSubscription(event.data);
    const custom = sub.custom_data ?? {};
    const companyId = (custom.company_id as string | undefined) ?? null;
    const ownerId = (custom.user_id as string | undefined) ?? null;

    // status overrides for lifecycle events
    let status = sub.status;
    if (t === "subscription.canceled") status = "canceled";
    if (t === "subscription.paused") status = "paused";

    // Upsert on paddle_subscription_id (unique).
    const row = {
      paddle_subscription_id: sub.paddle_subscription_id,
      paddle_customer_id: sub.paddle_customer_id,
      price_id: sub.price_id,
      plan: sub.plan,
      billing_cycle: sub.billing_cycle,
      status,
      current_period_start: sub.current_period_start,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end,
      company_id: companyId,
      owner_id: ownerId,
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin
      .from("subscriptions")
      .upsert(row, { onConflict: "paddle_subscription_id" });
    if (error) throw new Error(`subscriptions upsert: ${error.message}`);

    // Upsert customer for convenience.
    if (sub.paddle_customer_id) {
      const customerRow: Record<string, unknown> = {
        paddle_customer_id: sub.paddle_customer_id,
        user_id: ownerId,
        company_id: companyId,
        billing_email: (event.data.customer as { email?: string } | undefined)?.email ?? null,
      };
      await admin
        .from("customers")
        .upsert(customerRow, { onConflict: "paddle_customer_id" });
    }
    return;
  }

  if (t === "transaction.completed" || t === "transaction.paid") {
    // Payment confirmation – subscription lifecycle events carry the state we need.
    return;
  }

  // payment.failed / payment.succeeded / others: no-op for now (logged in billing_events).
}