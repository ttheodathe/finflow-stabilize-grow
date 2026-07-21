import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { openCheckout } from "@/lib/paddle/client";
import { PLANS, getPriceId, type PlanKey, type BillingCycle } from "@/lib/paddle/config";
import { toast } from "sonner";

interface Props {
  plan: PlanKey;
  cycle?: BillingCycle;
  className?: string;
  children?: React.ReactNode;
  /**
   * When true, redirect anonymous users to /signup?plan=… instead of /auth.
   * Used from the marketing pricing page.
   */
  fromMarketing?: boolean;
}

/**
 * Shared checkout entry-point used by the pricing page, upgrade panel, and
 * onboarding. Handles: enterprise → contact, free → signup/dashboard,
 * pro/business → open Paddle Checkout (or route to auth first if signed out).
 */
export function PlanCheckoutButton({
  plan,
  cycle = "monthly",
  className,
  children,
  fromMarketing,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const cfg = PLANS[plan];

  async function handleClick() {
    if (plan === "enterprise") {
      navigate({ to: "/contact" });
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Send anonymous visitors through signup with the chosen plan preserved.
        if (typeof window !== "undefined") localStorage.setItem("pendingPlan", plan);
        if (fromMarketing) {
          navigate({ to: "/signup", search: { plan } });
        } else {
          navigate({ to: "/auth", search: { mode: "login", next: "/settings" } });
        }
        return;
      }

      if (plan === "free") {
        navigate({ to: "/dashboard" });
        return;
      }

      const priceId = getPriceId(plan, cycle);
      if (!priceId) {
        toast.error(`No Paddle price configured for ${cfg.name} (${cycle})`);
        return;
      }

      const companyId =
        typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null;

      if (!companyId) {
        toast.error("Select or create a company first");
        navigate({ to: "/onboarding" });
        return;
      }

      await openCheckout({
        priceId,
        customerEmail: user.email ?? undefined,
        companyId,
        userId: user.id,
        plan,
        cycle,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Checkout failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}