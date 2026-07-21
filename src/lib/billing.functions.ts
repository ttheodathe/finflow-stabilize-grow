import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanKey } from "./paddle/config";

/**
 * Return the caller's most-recent subscription for a company (or user).
 * Uses RLS so users only see their own rows.
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
    } | null;
  });

/**
 * Create/ensure a Free-plan subscription record for the current user + company.
 * Called from onboarding when the user picks Free.
 */
export const createFreeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("subscriptions")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (existing?.id) return { id: existing.id as string, plan: "free" as const };
    const { data: row, error } = await sb
      .from("subscriptions")
      .insert({
        company_id: data.companyId,
        owner_id: context.userId,
        plan: "free",
        status: "active",
        billing_cycle: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string, plan: "free" as const };
  });

/**
 * Cancel the active subscription via Paddle API. Requires PADDLE_API_KEY.
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
    // Verify caller owns the subscription (RLS ensures they can only see their own).
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const { data: sub } = await sb
      .from("subscriptions")
      .select("paddle_subscription_id, owner_id")
      .eq("paddle_subscription_id", data.subscriptionId)
      .maybeSingle();
    if (!sub) throw new Error("Subscription not found");

    const apiKey = process.env.PADDLE_API_KEY;
    const env = process.env.PADDLE_ENV ?? "sandbox";
    if (!apiKey) throw new Error("PADDLE_API_KEY not configured");

    const base =
      env === "sandbox"
        ? "https://sandbox-api.paddle.com"
        : "https://api.paddle.com";

    const resp = await fetch(`${base}/subscriptions/${data.subscriptionId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ effective_from: data.atPeriodEnd ? "next_billing_period" : "immediately" }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Paddle cancel failed: ${resp.status} ${text}`);
    }
    return { ok: true as const };
  });

/**
 * List Paddle transactions (invoices) for the caller's paddle_customer_id.
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
      .select("paddle_customer_id")
      .eq("company_id", data.companyId)
      .not("paddle_customer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
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
    // Return as JSON string to preserve arbitrary Paddle payload without
    // fighting TanStack's serializable-return type inference.
    return { transactionsJson: JSON.stringify(json.data ?? []) };
  });