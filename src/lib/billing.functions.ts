import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanKey } from "./paddle/config";

/**
 * Return the caller's most-recent subscription for a company (or user).
 * Uses RLS so users only see their own rows. Includes both Paddle and
 * Polar identifier columns — a row will have one set populated depending
 * on which provider processed the payment.
 */
export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId?: string | null }) =>
    z.object({ companyId: z.string().uuid().nullable().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    let query = sb
      .from("subscriptions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (data.companyId) {
      query = query.eq("company_id", data.companyId);
    } else {
      query = query.eq("owner_id", context.userId);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows?.[0] ?? null) as {
      id: string;
      plan: PlanKey;
      status: string;
      billing_cycle: "monthly" | "yearly" | null;
      current_period_end: string | null;
      cancel_at_period_end: boolean;
      paddle_subscription_id: string | null;
      paddle_customer_id: string | null;
      polar_subscription_id: string | null;
      polar_customer_id: string | null;
    } | null;
  });

/**
 * subscriptions has UNIQUE(user_id) — every account has exactly one row.
 * Always upsert on user_id rather than select-then-insert, so re-running
 * this (e.g. switching plan choice, or retrying onboarding) never collides
 * with an existing row for the same user.
 */
export const createFreeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          owner_id: context.userId,
          company_id: data.companyId,
          plan: "free",
          status: "active",
          billing_cycle: null,
          polar_subscription_id: null,
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, plan: "free" as const };
  });

/**
 * Called when the user picks a paid plan but hasn't finished checkout yet.
 * Records the *intended* plan with status "pending" (never "active"/"free")
 * so nothing downstream — dashboard access, feature gating — treats this
 * account as paid or as free until the Polar webhook confirms payment and
 * flips status to "active".
 */
export const createPendingSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; plan: "pro" | "business"; cycle: "monthly" | "yearly" }) =>
    z
      .object({
        companyId: z.string().uuid(),
        plan: z.enum(["pro", "business"]),
        cycle: z.enum(["monthly", "yearly"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("subscriptions")
      .upsert(
        {
          user_id: context.userId,
          owner_id: context.userId,
          company_id: data.companyId,
          plan: data.plan,
          status: "pending",
          billing_cycle: data.cycle,
          polar_subscription_id: null,
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, plan: data.plan, status: "pending" as const };
  });

/**
 * Cancel the active subscription. Detects Paddle vs Polar automatically
 * by checking which ID column the given subscriptionId matches, then
 * calls that provider's cancel API.
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subscriptionId: string; atPeriodEnd?: boolean }) =>
    z
      .object({
        subscriptionId: z.string().min(1),
        atPeriodEnd: z.boolean().optional().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const { data: sub } = await sb
      .from("subscriptions")
      .select("paddle_subscription_id, polar_subscription_id, owner_id")
      .or(
        `paddle_subscription_id.eq.${data.subscriptionId},polar_subscription_id.eq.${data.subscriptionId}`,
      )
      .maybeSingle();
    if (!sub) throw new Error("Subscription not found");

    const isPolar = sub.polar_subscription_id === data.subscriptionId;

    if (isPolar) {
      const { polar } = await import("@/lib/polar/server");
      if (data.atPeriodEnd) {
        await polar.subscriptions.update({
          id: data.subscriptionId,
          subscriptionUpdate: { cancelAtPeriodEnd: true },
        });
      } else {
        await polar.subscriptions.revoke({ id: data.subscriptionId });
      }
      return { ok: true as const };
    }

    // Paddle path (unchanged)
    const apiKey = process.env.PADDLE_API_KEY;
    const env = process.env.PADDLE_ENV ?? "sandbox";
    if (!apiKey) throw new Error("PADDLE_API_KEY not configured");

    const base =
      env === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

    const resp = await fetch(`${base}/subscriptions/${data.subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        effective_from: data.atPeriodEnd ? "next_billing_period" : "immediately",
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Paddle cancel failed: ${resp.status} ${text}`);
    }
    return { ok: true as const };
  });

/**
 * List invoices/orders for the caller's company. Checks for a Polar
 * customer first (new subscriptions), falls back to Paddle transactions
 * (existing subscriptions from before the Polar migration).
 */
export const listInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const { data: sub } = await sb
      .from("subscriptions")
      .select("paddle_customer_id, polar_customer_id")
      .eq("company_id", data.companyId)
      .or("paddle_customer_id.not.is.null,polar_customer_id.not.is.null")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub?.polar_customer_id) {
      const env = process.env.POLAR_SERVER ?? "sandbox";
      const base =
        env === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
      const resp = await fetch(
        `${base}/v1/orders?customer_id=${encodeURIComponent(sub.polar_customer_id)}&limit=25`,
        { headers: { Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}` } },
      );
      if (!resp.ok) return { transactionsJson: "[]" };
      const json = (await resp.json()) as { items?: unknown[] };
      return { transactionsJson: JSON.stringify(json.items ?? []) };
    }

    const customerId = sub?.paddle_customer_id as string | undefined;
    if (!customerId) return { transactionsJson: "[]" };

    const apiKey = process.env.PADDLE_API_KEY;
    const env = process.env.PADDLE_ENV ?? "sandbox";
    if (!apiKey) return { transactionsJson: "[]" };
    const base =
      env === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

    const resp = await fetch(
      `${base}/transactions?customer_id=${encodeURIComponent(customerId)}&per_page=25`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!resp.ok) return { transactionsJson: "[]" };
    const json = (await resp.json()) as { data?: unknown[] };
    return { transactionsJson: JSON.stringify(json.data ?? []) };
  });
