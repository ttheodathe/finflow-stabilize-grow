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
    const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(`subscriptions upsert: ${error.message}`);

    // Note: `customers` is this app's own AR/invoicing table (the tenant's
    // clients — requires name, company_id), not a Polar-customer mapping
    // table. Billing only needs subscriptions.polar_customer_id, already
    // set above; there is nothing else to sync here.
    return;
  }

  if (t === "order.paid") {
    await createPartnerCommissionForOrder(event.data, admin);
    return;
  }
  // other events: no-op for now (still logged in billing_events)
}

// Partner & Referral module, Phase 1: recurring-% commission on each paid
// order. Runs after the subscriptions upsert above (order events always
// follow subscription events for the same billing cycle), but doesn't
// depend on it — it reads company/partner state fresh from the DB so a
// re-delivered or out-of-order webhook is still safe. The `source_order_id`
// unique constraint on partner_commissions is the actual double-pay guard.
//
// biome-ignore lint/suspicious/noExplicitAny: admin client typed loosely, same as handleEvent above
async function createPartnerCommissionForOrder(data: Record<string, unknown>, admin: any) {
  const orderId = data.id as string | undefined;
  const subscriptionId = (data.subscription_id as string | null) ?? null;
  const totalAmountCents = data.total_amount as number | undefined;
  const currency = ((data.currency as string | undefined) ?? "usd").toUpperCase();

  if (!orderId || !subscriptionId || typeof totalAmountCents !== "number") {
    console.warn(
      "[polar-webhook] order.paid missing id/subscription_id/total_amount, skipping commission",
    );
    return;
  }

  const { data: subRow } = await admin
    .from("subscriptions")
    .select("company_id")
    .eq("polar_subscription_id", subscriptionId)
    .maybeSingle();

  const companyId = subRow?.company_id as string | undefined;
  if (!companyId) return; // no company on this subscription yet — nothing to attribute

  const { data: attribution } = await admin
    .from("partner_referral_attributions")
    .select("last_touch_partner_id")
    .eq("company_id", companyId)
    .maybeSingle();

  const partnerId = attribution?.last_touch_partner_id as string | undefined;
  if (!partnerId) return; // this company wasn't referred by a partner

  const { data: settings } = await admin
    .from("partner_program_settings")
    .select("multi_tier_enabled, max_tiers, tier2_rate, tier3_rate")
    .eq("id", true)
    .maybeSingle();

  const billedAmount = totalAmountCents / 100;

  // Walk the tier-1 partner, then (if multi-tier is on) its upline, up to
  // max_tiers. A visited-set guards against a corrupted/cyclical
  // referred_by_partner_id chain ever paying the same partner twice or
  // looping forever — belt-and-suspenders alongside the ON DELETE SET NULL
  // on that column.
  const tierRates: Record<number, number | null> = {
    1: null, // tier 1 always uses the earning partner's own commission_rate
    2: settings?.tier2_rate != null ? Number(settings.tier2_rate) : null,
    3: settings?.tier3_rate != null ? Number(settings.tier3_rate) : null,
  };
  const maxTiers = settings?.multi_tier_enabled ? Math.min(Number(settings.max_tiers ?? 1), 3) : 1;

  const visited = new Set<string>();
  let currentPartnerId: string | undefined = partnerId;

  for (let tier = 1; tier <= maxTiers && currentPartnerId; tier++) {
    if (visited.has(currentPartnerId)) break;
    visited.add(currentPartnerId);

    const { data: partner } = (await admin
      .from("partners")
      .select("id, status, commission_rate, referred_by_partner_id")
      .eq("id", currentPartnerId)
      .maybeSingle()) as {
      data: {
        id: string;
        status: string;
        commission_rate: number;
        referred_by_partner_id: string | null;
      } | null;
    };

    if (!partner || partner.status !== "active") break;

    const rate = tier === 1 ? Number(partner.commission_rate) : (tierRates[tier] ?? 0);
    if (rate > 0) {
      const commissionAmount = Math.round(billedAmount * (rate / 100) * 100) / 100;
      const flag = await detectSuspiciousReferral(admin, companyId, currentPartnerId);

      // source_order_id + partner_id + tier is UNIQUE — a retried/
      // re-delivered webhook for the same order will hit that constraint
      // and be silently skipped, never double-paying a partner. All
      // calculation happens here, server-side, never trusting the client.
      const { error } = await admin.from("partner_commissions").insert({
        partner_id: currentPartnerId,
        company_id: companyId,
        source_order_id: orderId,
        billed_amount: billedAmount,
        currency,
        commission_rate: rate,
        commission_amount: commissionAmount,
        tier,
        flagged_for_review: flag.suspicious,
        flag_reason: flag.reason,
      });

      if (error) {
        if ((error as { code?: string }).code !== "23505") {
          console.error(`[polar-webhook] partner commission insert failed (tier ${tier}):`, error);
        }
      } else {
        await notifyPartnerOfCommission(admin, currentPartnerId, commissionAmount, currency);
      }
    }

    currentPartnerId =
      tier < maxTiers ? (partner.referred_by_partner_id as string | undefined) : undefined;
  }
}

// Lightweight, informational fraud signal — flags the commission for staff
// review rather than blocking it outright (a false positive here would
// wrongly withhold a legitimate partner's earnings, which is worse than a
// human spending 30 seconds reviewing a flagged row). Currently checks for
// referral-to-payment velocity that looks automated.
// biome-ignore lint/suspicious/noExplicitAny: admin client typed loosely, same as elsewhere in this file
async function detectSuspiciousReferral(
  admin: any,
  companyId: string,
  partnerId: string,
): Promise<{ suspicious: boolean; reason: string | null }> {
  try {
    const { data: attribution } = await admin
      .from("partner_referral_attributions")
      .select("attributed_at")
      .eq("company_id", companyId)
      .maybeSingle();

    if (attribution?.attributed_at) {
      const minutesToConvert =
        (Date.now() - new Date(attribution.attributed_at as string).getTime()) / 60000;
      // A signup-to-paid-order conversion in under 2 minutes is unusual for
      // a real customer evaluating accounting software, and worth a look.
      if (minutesToConvert >= 0 && minutesToConvert < 2) {
        return {
          suspicious: true,
          reason: `Converted to paid ${minutesToConvert.toFixed(1)} min after signup`,
        };
      }
    }

    // Same partner already has many companies attributed today — could be
    // legitimate (a busy affiliate) or could be self-dealing with fake
    // accounts. Flag for a human either way rather than guessing.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("partner_referral_attributions")
      .select("id", { count: "exact", head: true })
      .eq("last_touch_partner_id", partnerId)
      .gte("attributed_at", since);

    if ((count ?? 0) > 20) {
      return {
        suspicious: true,
        reason: `Partner referred ${count} new companies in the last 24h`,
      };
    }

    return { suspicious: false, reason: null };
  } catch {
    return { suspicious: false, reason: null }; // never let a fraud check itself break commission creation
  }
}

// Best-effort — a failed notification email should never fail the webhook
// or roll back the commission that was already recorded.
// biome-ignore lint/suspicious/noExplicitAny: admin client typed loosely, same as elsewhere in this file
async function notifyPartnerOfCommission(
  admin: any,
  partnerId: string,
  amount: number,
  currency: string,
) {
  try {
    const { data: partner } = await admin
      .from("partners")
      .select("user_id, business_name")
      .eq("id", partnerId)
      .maybeSingle();
    if (!partner) return;

    const { data: authUser } = await admin.auth.admin.getUserById(partner.user_id);
    const email = authUser?.user?.email;
    if (!email) return;

    const { sendEmail } = await import("@/lib/email");
    const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amount,
    );
    await sendEmail({
      to: email,
      subject: `You earned a ${formatted} referral commission`,
      html: `<p>Hi ${partner.business_name},</p><p>A customer you referred to FinFlowTrack just made a payment, earning you <strong>${formatted}</strong> in commission. It's now pending approval in your partner dashboard.</p><p><a href="https://finflowtrack.com/partners">View your dashboard</a></p>`,
    });
  } catch (err) {
    console.error("[polar-webhook] partner commission email failed:", err);
  }
}
