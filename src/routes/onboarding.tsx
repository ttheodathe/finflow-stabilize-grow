import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/currency-select";
import { PLANS, type PlanKey } from "@/components/Subscription_Plans";
import { toast } from "sonner";
import { Loader2, Check, ArrowRight, Building2, CreditCard, User } from "lucide-react";
import { hasCompletedOnboarding } from "@/lib/auth-flow";
import { openCheckout } from "@/lib/paddle/client";
import { getPriceId } from "@/lib/paddle/config";
import { createFreeSubscription } from "@/lib/billing.functions";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Set up your workspace — FinFlow Track" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    if (!data.user.email_confirmed_at) {
      throw redirect({ to: "/verify-email", search: { email: data.user.email ?? undefined } });
    }
    // If onboarding is already complete (company membership exists), never
    // show the wizard again — even after refresh, new tab, or re-login.
    const done = await hasCompletedOnboarding(data.user.id);
    if (done) throw redirect({ to: "/dashboard" });
    return { user: data.user };
  },
  component: OnboardingPage,
});

type Step = "profile" | "company" | "plan" | "done";

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("profile");
  const [saving, setSaving] = useState(false);
  const [resuming, setResuming] = useState(true);

  const [fullName, setFullName] = useState<string>(
    (user.user_metadata?.full_name as string) ?? "",
  );
  const [companyName, setCompanyName] = useState("");
  const [companyCurrency, setCompanyCurrency] = useState("USD");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  const pendingPlan =
    (typeof window !== "undefined" && (localStorage.getItem("pendingPlan") as PlanKey | null)) ||
    ((user.user_metadata?.plan as PlanKey | undefined) ?? "free");
  const [plan, setPlan] = useState<PlanKey>(pendingPlan);

  // Resume from the last incomplete step instead of restarting.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [progressRes, memberRes, profileRes] = await Promise.all([
        supabase
          .from("onboarding_progress")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;

      if (memberRes.data) {
        // Ground truth: user already has a company. Onboarding is done.
        navigate({ to: "/dashboard" });
        return;
      }

      if (profileRes.data?.full_name && !fullName) {
        setFullName(profileRes.data.full_name);
      }

      const p = progressRes.data;
      let nextStep: Step = "profile";
      if (p?.company_completed) nextStep = "plan";
      else if (p?.profile_completed || profileRes.data?.full_name) nextStep = "company";
      setStep(nextStep);
      setResuming(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName }, { onConflict: "id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    await supabase.from("onboarding_progress").upsert(
      { user_id: user.id, profile_completed: true, current_step: "company" },
      { onConflict: "user_id" },
    );
    setStep("company");
  }

  async function saveCompany() {
    if (!companyName.trim()) return toast.error("Company name is required");
    setSaving(true);
    const { data, error } = await supabase.rpc("create_company", {
      p_name: companyName.trim(),
      p_currency: companyCurrency || "USD",
      p_phone: companyPhone.trim() || undefined,
      p_address: companyAddress.trim() || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    const companyId = (data as any)?.id;
    if (companyId && typeof window !== "undefined") {
      localStorage.setItem("currentCompanyId", companyId);
      window.dispatchEvent(new CustomEvent("company-changed", { detail: { companyId } }));
    }
    await supabase.from("onboarding_progress").upsert(
      { user_id: user.id, company_completed: true, current_step: "plan" },
      { onConflict: "user_id" },
    );
    setStep("plan");
  }

  async function savePlan() {
    setSaving(true);
    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null;

    // Paid plans → open Paddle Checkout. Webhook activates the subscription.
    if (plan === "pro" || plan === "business") {
      const priceId = getPriceId(plan as "pro" | "business", "monthly");
      if (!priceId || !companyId) {
        setSaving(false);
        toast.error("Missing plan configuration");
        return;
      }
      try {
        await openCheckout({
          priceId,
          customerEmail: user.email ?? undefined,
          companyId,
          userId: user.id,
          plan: plan as "pro" | "business",
          cycle: "monthly",
          successUrl: `${window.location.origin}/dashboard`,
        });
      } catch (e) {
        setSaving(false);
        toast.error(e instanceof Error ? e.message : "Checkout failed");
        return;
      }
      // Also create a placeholder free row so gating helpers don't 404 while
      // waiting for the webhook to activate the paid plan.
      if (companyId) {
        try {
          await createFreeSubscription({ data: { companyId } });
        } catch {
          // ignore — webhook will upsert real subscription
        }
      }
    } else if (plan === "free" && companyId) {
      try {
        await createFreeSubscription({ data: { companyId } });
      } catch (e) {
        setSaving(false);
        toast.error(e instanceof Error ? e.message : "Failed to create subscription");
        return;
      }
    }
    await supabase.from("onboarding_progress").upsert(
      {
        user_id: user.id,
        financial_completed: true,
        branding_completed: true,
        completed: true,
        completed_at: new Date().toISOString(),
        current_step: "done",
      },
      { onConflict: "user_id" },
    );
    if (typeof window !== "undefined") localStorage.removeItem("pendingPlan");
    setSaving(false);
    toast.success("Workspace ready");
    // Head straight to the workspace — no dead-end "all set" screen.
    navigate({ to: "/dashboard", replace: true });
  }

  const steps = useMemo(
    () =>
      [
        { id: "profile" as const, label: "Your profile", icon: User },
        { id: "company" as const, label: "Create company", icon: Building2 },
        { id: "plan" as const, label: "Subscription", icon: CreditCard },
      ],
    [],
  );

  return (
    <div className="min-h-screen bg-gradient-subtle px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {resuming ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your setup…
          </div>
        ) : (
          <>
        <h1 className="text-center text-3xl font-bold mb-2">Welcome to FinFlow Track</h1>
        <p className="text-center text-muted-foreground mb-8">
          A few quick steps to set up your workspace.
        </p>

        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, i) => {
            const active = s.id === step;
            const done = steps.findIndex((x) => x.id === step) > i;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-px bg-muted-foreground/20 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-elevated">
          {step === "profile" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Tell us about you</h2>
              <div>
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user.email ?? ""} disabled />
              </div>
              <Button onClick={saveProfile} disabled={saving || !fullName.trim()} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "company" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Create your first company</h2>
              <p className="text-sm text-muted-foreground">
                This becomes your default workspace. You can add more later.
              </p>
              <div>
                <Label>Company name *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Currency</Label>
                  <CurrencySelect value={companyCurrency} onValueChange={setCompanyCurrency} />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>
              <Button onClick={saveCompany} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create company <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === "plan" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Confirm your plan</h2>
              <p className="text-sm text-muted-foreground">
                Start on the plan you selected. You can upgrade anytime from settings.
              </p>
              <div className="grid gap-3">
                {PLANS.filter((p) => !p.comingSoon).map((p) => {
                  const selected = plan === p.key;
                  return (
                    <button
                      type="button"
                      key={p.key}
                      onClick={() => setPlan(p.key)}
                      className={`text-left rounded-xl border p-4 transition ${
                        selected
                          ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {p.priceMonthly === 0 ? "Free" : `$${p.priceMonthly}`}
                          </div>
                          {p.priceMonthly > 0 && (
                            <div className="text-xs text-muted-foreground">/month</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button onClick={savePlan} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Finish setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}