import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations.
const supabase = _sb as any; // untyped-db
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CreditCard, ArrowRight } from "lucide-react";
import { getPendingPlan } from "@/lib/auth-flow";
import { PLANS, type PlanKey, formatPlanPrice } from "@/lib/paddle/config";
import { getPolarProductId } from "@/lib/polar/config";
import { createFreeSubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/complete-payment")({
  ssr: false,
  head: () => ({ meta: [{ title: "Complete your payment — FinFlow Track" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    if (!data.user.email_confirmed_at) {
      throw redirect({ to: "/verify-email", search: { email: data.user.email ?? undefined } });
    }
    const pending = await getPendingPlan(data.user.id);
    // Nothing to complete — either never chose a paid plan, or already paid.
    if (!pending) throw redirect({ to: "/dashboard" });
    return { user: data.user, pending };
  },
  component: CompletePaymentPage,
});

function CompletePaymentPage() {
  const { user, pending } = Route.useRouteContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"pay" | "free" | null>(null);

  const plan = (pending.plan as PlanKey) ?? "pro";
  const cfg = PLANS[plan] ?? PLANS.pro;
  const cycle = (pending.billingCycle as "monthly" | "yearly") ?? "monthly";

  function payNow() {
    if (!pending.companyId) {
      toast.error("Missing company for this subscription — contact support.");
      return;
    }
    const productId = getPolarProductId(plan as "pro" | "business", cycle);
    if (!productId) {
      toast.error("Missing plan configuration");
      return;
    }
    setLoading("pay");
    const params = new URLSearchParams({
      productId,
      companyId: pending.companyId,
      userId: user.id,
    });
    window.location.href = `/api/public/polar/checkout?${params.toString()}`;
  }

  async function switchToFree() {
    if (!pending.companyId) {
      toast.error("Missing company for this subscription — contact support.");
      return;
    }
    setLoading("free");
    try {
      await createFreeSubscription({ data: { companyId: pending.companyId } });
      toast.success("Switched to the Free plan");
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      setLoading(null);
      toast.error(e instanceof Error ? e.message : "Failed to switch plans");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-card p-8 shadow-elevated text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Complete your payment</h1>
          <p className="text-sm text-muted-foreground mb-6">
            You selected the <span className="font-medium">{cfg.name}</span> plan (
            {formatPlanPrice(cfg)}), but checkout wasn't finished. Your workspace is ready — it
            just needs an active plan before you can get in.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={payNow} disabled={loading !== null} className="w-full">
              {loading === "pay" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Complete payment <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={switchToFree}
              disabled={loading !== null}
              variant="outline"
              className="w-full"
            >
              {loading === "free" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Switch to Free plan instead
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
