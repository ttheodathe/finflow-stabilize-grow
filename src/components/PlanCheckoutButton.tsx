import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, type PlanKey, type BillingCycle } from "@/lib/paddle/config";
import { getPolarProductId } from "@/lib/polar/config";
import { toast } from "sonner";

interface Props {
  plan: PlanKey;
  cycle?: BillingCycle;
  className?: string;
  children?: React.ReactNode;
  fromMarketing?: boolean;
}

/**
 * Shared checkout entry-point used by the pricing page, upgrade panel, and
 * onboarding. Handles: enterprise → contact, free → signup/dashboard,
 * pro/business → redirect to Polar-hosted checkout.
 *
 * Plan display metadata (name, description, price, features) still comes
 * from paddle/config.ts — that's just the shared plan catalog, not tied to
 * a billing provider. Only the actual checkout mechanism is Polar now.
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

      const productId = getPolarProductId(plan, cycle);
      if (!productId) {
        toast.error(`No Polar product configured for ${cfg.name} (${cycle})`);
        return;
      }

      const companyId =
        typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null;

      if (!companyId) {
        toast.error("Select or create a company first");
        navigate({ to: "/onboarding" });
        return;
      }

      const params = new URLSearchParams({
        productId,
        companyId,
        userId: user.id,
      });
      window.location.href = `/api/public/polar/checkout?${params.toString()}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Checkout failed: ${msg}`);
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
