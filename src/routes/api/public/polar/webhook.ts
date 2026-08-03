import { createFileRoute } from "@tanstack/react-router";
import { verifyPolarSignature, normalizePolarSubscription } from "@/lib/polar/webhook.server";

export const Route = createFileRoute("/api/public/polar/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.POLAR_WEBHOOK_SECRET;
        const rawBody = await request.text();

        const verified = verifyPolarSignature(rawBody, request.headers, secret ?? "");
        if (!verified.ok) {
          console.warn("[polar-webhook] rejected:", verified.error);
          return new Response(verified.error, { status: verified.status });
        }
        const { event } = verified;
        const eventId = (event.data as { id?: string }).id
          ? `${event.type}:${(event.data as { id: string }).id}`
          : crypto.randomUUID();

        const { supabaseAdmin: _admin } = await import("@/integrations/supabase/client.server");
        // biome-ignore lint/suspicious/noExplicitAny: schema types don't yet include billing tables
        const supabaseAdmin = _admin as any;

        const insertEvent = await supabaseAdmin
          .from("billing_events")
          .insert({
            polar_event_id: eventId,
            source: "polar",
            event_type: event.type,
            payload: event,
            processed: false,
          })
          .select("id")
          .maybeSingle();

        if (insertEvent.error) {
          const code = (insertEvent.error as { code?: string }).code;
          if (code === "23505") return new Response("ok (duplicate)", { status: 200 });
          console.error("[polar-webhook] insert event failed:", insertEvent.error);
          return new Response("Server error", { status: 500 });
        }

        try {
          await handleEvent(event, supabaseAdmin);
          await supabaseAdmin
            .from("billing_events")
            .update({ processed: true })
            .eq("polar_event_id", eventId);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[polar-webhook] handler failed:", msg);
          await supabaseAdmin
            .from("billing_events")
            .update({ processed: false, error: msg })
            .eq("polar_event_id", eventId);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

// biome-ignore lint/suspicious/noExplicitAny: admin client typed loosely
async function handleEvent(event: { type: string; data: Record<string, unknown> }, admin: any) {
  const t = event.type;

  if (
    t === "subscription.created" ||
    t === "subscription.updated" ||
    t === "subscription.active" ||
    t === "subscription.canceled" ||
    t === "subscription.revoked"
  ) {
    const sub = normalizePolarSubscription(event.data);
    const custom = sub.custom_data ?? {};
    const companyId = (custom.company_id as string | undefined) ?? null;
    const ownerId = (custom.user_id as string | undefined) ?? null;

    let status = sub.status;
    if (t === "subscription.canceled" || t === "subscription.revoked") status = "canceled";

    if (!ownerId) {
      // No user_id in checkout metadata — can't attribute this event to an
      // account. Log and skip rather than writing an orphaned row.
      console.warn("[polar-webhook] subscription event missing user_id metadata, skipping");
      return;
    }

    // subscriptions has UNIQUE(user_id) — every account has at most one row,
    // created up-front (as "pending" during checkout, or "active"/free at
    // signup). Upsert on user_id so this always updates that row in place;
    // upserting on polar_subscription_id would instead try to INSERT a
    // second row for the same user and fail on the user_id constraint.
    const row = {
      user_id: ownerId,
      polar_subscription_id: sub.polar_subscription_id,
      polar_customer_id: sub.polar_customer_id,
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
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(`subscriptions upsert: ${error.message}`);

    if (sub.polar_customer_id) {
      await admin.from("customers").upsert(
        {
          polar_customer_id: sub.polar_customer_id,
          user_id: ownerId,
          company_id: companyId,
        },
        { onConflict: "polar_customer_id" },
      );
    }
    return;
  }
  // order.paid / other events: no-op for now (still logged in billing_events)
}
