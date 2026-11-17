import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanKey } from "./paddle/config";

async function requireActiveCompanyOwner(sb: any, companyId: string, userId: string) {
  const [{ data: company, error: companyError }, { data: membership, error: memberError }] =
    await Promise.all([
      sb.from("companies").select("user_id").eq("id", companyId).maybeSingle(),
      sb
        .from("company_members")
        .select("role,status")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (companyError) throw new Error(companyError.message);
  if (memberError) throw new Error(memberError.message);
  if (
    !company ||
    company.user_id !== userId ||
    membership?.role !== "owner" ||
    membership?.status !== "active"
  ) {
    throw new Error("Only the active company owner can manage billing.");
  }
}

/**
 * Return the caller's most-recent subscription for a company (or user).
 * Uses RLS so users only see their own rows. Includes both Paddle and
 * Polar identifier columns — a row will have one set populated depending
 * on which provider processed the payment.
 */
export const getMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId?: string | null }) =>
    z.object({ companyId: z.string().uuid().nullable().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    const base = () =>
      sb.from("subscriptions").select("*").order("updated_at", { ascending: false }).limit(1);

    let row: any | null = null;
    let isCompanyOwner = true;

    if (data.companyId) {
      const { data: membership, error: memberError } = await sb
        .from("company_members")
        .select("role,status")
        .eq("company_id", data.companyId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (memberError) throw new Error(memberError.message);
      if (membership?.status !== "active") return null;

      const { data: company, error: companyError } = await sb
        .from("companies")
        .select("user_id")
        .eq("id", data.companyId)
        .maybeSingle();
      if (companyError) throw new Error(companyError.message);
      if (!company?.user_id) return null;
      isCompanyOwner = membership.role === "owner" && company.user_id === context.userId;

      // Use the server-only service client after verifying active membership.
      // This lets collaborators read the company's effective plan without
      // exposing the owner's billing identifiers or their own personal plan.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ownerFilter = `owner_id.eq.${company.user_id},user_id.eq.${company.user_id}`;
      const companyRow = await (supabaseAdmin as any)
        .from("subscriptions")
        .select("*")
        .eq("company_id", data.companyId)
        .or(ownerFilter)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (companyRow.error) throw new Error(companyRow.error.message);
      row = companyRow.data?.[0] ?? null;

      if (!row) {
        const ownerRow = await (supabaseAdmin as any)
          .from("subscriptions")
          .select("*")
          .or(ownerFilter)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (ownerRow.error) throw new Error(ownerRow.error.message);
        row = ownerRow.data?.[0] ?? null;
      }
    } else {
      const res = await base().or(
        `owner_id.eq.${context.userId},user_id.eq.${context.userId}`,
      );
      if (res.error) throw new Error(res.error.message);
      row = res.data?.[0] ?? null;
    }

    if (!row) return null;
    if (!isCompanyOwner) {
      return {
        id: row.id,
        plan: row.plan,
        status: row.status,
        billing_cycle: row.billing_cycle,
        current_period_end: row.current_period_end,
        cancel_at_period_end: row.cancel_at_period_end,
        paddle_subscription_id: null,
        paddle_customer_id: null,
        polar_subscription_id: null,
        polar_customer_id: null,
      };
    }
    return row as {
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
    };
  });

/**
 * subscriptions has UNIQUE(user_id) — every account has exactly one row.
 * Always upsert on user_id rather than select-then-insert, so re-running
 * this (e.g. switching plan choice, or retrying onboarding) never collides
 * with an existing row for the same user.
 */
export const createFreeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    await requireActiveCompanyOwner(sb, data.companyId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
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
  .validator((input: { companyId: string; plan: "pro" | "business"; cycle: "monthly" | "yearly" }) =>
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
    await requireActiveCompanyOwner(sb, data.companyId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await (supabaseAdmin as any)
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
  .validator((input: { subscriptionId: string; atPeriodEnd?: boolean }) =>
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
      .select("paddle_subscription_id, polar_subscription_id, owner_id, user_id, company_id")
      .or(
        `paddle_subscription_id.eq.${data.subscriptionId},polar_subscription_id.eq.${data.subscriptionId}`,
      )
      .maybeSingle();
    if (!sub) throw new Error("Subscription not found");
    if (sub.owner_id !== context.userId && sub.user_id !== context.userId) {
      throw new Error("Only the subscription owner can manage billing.");
    }
    if (sub.company_id) {
      await requireActiveCompanyOwner(sb, sub.company_id, context.userId);
    }

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
  .validator((input: { companyId: string }) =>
    z.object({ companyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic schema
    const sb = context.supabase as any;
    await requireActiveCompanyOwner(sb, data.companyId, context.userId);
    const { data: company, error: companyError } = await sb
      .from("companies")
      .select("user_id")
      .eq("id", data.companyId)
      .single();
    if (companyError) throw new Error(companyError.message);
    const ownerFilter = `owner_id.eq.${company.user_id},user_id.eq.${company.user_id}`;
    let subResult = await sb
      .from("subscriptions")
      .select("paddle_customer_id, polar_customer_id")
      .eq("company_id", data.companyId)
      .or(ownerFilter)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subResult.error) throw new Error(subResult.error.message);
    if (!subResult.data) {
      subResult = await sb
        .from("subscriptions")
        .select("paddle_customer_id, polar_customer_id")
        .or(ownerFilter)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subResult.error) throw new Error(subResult.error.message);
    }
    const sub = subResult.data;

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
