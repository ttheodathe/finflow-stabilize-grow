import type { User } from "@supabase/supabase-js";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations.
const supabase = _sb as any; // untyped-db

export type NextRoute =
  | { to: "/auth"; search: { mode: "login" } }
  | { to: "/verify-email"; search: { email?: string } }
  | { to: "/onboarding" }
  | { to: "/dashboard" };

/**
 * Ground-truth check: has the user completed onboarding?
 *
 * A row in `company_members` is the authoritative signal — `create_company`
 * only inserts it after every setup step succeeds. We do NOT rely on
 * `onboarding_progress.completed` alone because that row may fail to persist
 * (missing table/RLS/unique constraint) and would trap users in a loop.
 *
 * As a self-heal, when a membership exists but `onboarding_progress.completed`
 * is false, we upsert it to true so future checks are fast and consistent.
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data: member } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!member) return false;

  // Fire-and-forget self-heal — never block the redirect on this.
  void supabase
    .from("onboarding_progress")
    .upsert(
      {
        user_id: userId,
        profile_completed: true,
        company_completed: true,
        financial_completed: true,
        branding_completed: true,
        completed: true,
        completed_at: new Date().toISOString(),
        current_step: "done",
      },
      { onConflict: "user_id" },
    )
    .then(() => {});

  // Persist the last-used company for the sidebar switcher.
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("currentCompanyId");
    if (!stored && member.company_id) {
      localStorage.setItem("currentCompanyId", member.company_id);
    }
  }

  return true;
}

/**
 * subscriptions has UNIQUE(user_id) — at most one row per account. If that
 * row's status is "pending", the user picked a paid plan during onboarding
 * (or an upgrade) but hasn't completed checkout — the Polar webhook flips
 * it to "active" once payment succeeds. Used to keep pending users out of
 * the dashboard entirely, distinct from genuinely free/active accounts.
 */
export async function getPendingPlan(
  userId: string,
): Promise<{ plan: string; billingCycle: string | null; companyId: string | null } | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, billing_cycle, company_id, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.status !== "pending") return null;
  return { plan: data.plan, billingCycle: data.billing_cycle, companyId: data.company_id };
}

export async function resolveNextRoute(user: User | null): Promise<NextRoute> {
  if (!user) return { to: "/auth", search: { mode: "login" } };
  if (!user.email_confirmed_at) {
    return { to: "/verify-email", search: { email: user.email ?? undefined } };
  }
  const done = await hasCompletedOnboarding(user.id);
  return done ? { to: "/dashboard" } : { to: "/onboarding" };
}
