import { startPolarCheckout } from "@/lib/polar/checkout-client";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase as _sb } from "@/integrations/supabase/client";
// Schema drift: generated Database types lag behind applied migrations.
const supabase = _sb as any; // untyped-db
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/currency-select";
import { PLANS, PLAN_ORDER, type PlanKey, formatPlanPrice } from "@/lib/paddle/config";
import { getPolarProductId } from "@/lib/polar/config";
import { toast } from "sonner";
import { Loader2, Check, ArrowRight, Building2, CreditCard } from "lucide-react";
import { hasCompletedOnboarding } from "@/lib/auth-flow";
import { createFreeSubscription, createPendingSubscription } from "@/lib/billing.functions";

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

type Goal = "invoice" | "expense" | "reports" | "explore";
const GOALS: { id: Goal; label: string }[] = [
  { id: "invoice", label: "Send an invoice" },
  { id: "expense", label: "Track expenses" },
  { id: "reports", label: "See reports" },
  { id: "explore", label: "Not sure yet" },
];
const GOAL_ROUTES = {
  invoice: "/invoices",
  expense: "/expenses",
  reports: "/reports",
  explore: "/dashboard",
} as const;

function OnboardingPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("profile");
  const [saving, setSaving] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [goal, setGoal] = useState<Goal>("explore");

  const [fullName, setFullName] = useState<string>((user.user_metadata?.full_name as string) ?? "");
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
        supabase.from("onboarding_progress").select("*").eq("user_id", user.id).maybeSingle(),
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

  async function saveCompany(): Promise<boolean> {
    if (!companyName.trim()) {
      toast.error("Company name is required");
      return false;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("create_company", {
      p_name: companyName.trim(),
      p_currency: companyCurrency || "USD",
      p_phone: companyPhone.trim() || undefined,
      p_address: companyAddress.trim() || undefined,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    const companyId = (data as any)?.id;
    if (companyId && typeof window !== "undefined") {
      localStorage.setItem("currentCompanyId", companyId);
      window.dispatchEvent(new CustomEvent("company-changed", { detail: { companyId } }));
    }
    await supabase
      .from("onboarding_progress")
      .upsert(
        { user_id: user.id, company_completed: true, current_step: "plan" },
        { onConflict: "user_id" },
      );
    setStep("plan");
    return true;
  }

  // One screen for name + company (+ first goal). Free-plan users go straight into the
  // app after this: the plan step is only shown when a paid plan needs checkout, or as a
  // fallback if creating the free subscription failed.
  async function saveProfileAndCompany() {
    if (!fullName.trim()) return void toast.error("Please enter your name");
    if (!companyName.trim()) return void toast.error("Company name is required");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName }, { onConflict: "id" });
    if (error) {
      setSaving(false);
      return void toast.error(error.message);
    }
    await supabase
      .from("onboarding_progress")
      .upsert(
        { user_id: user.id, profile_completed: true, current_step: "company" },
        { onConflict: "user_id" },
      );
    if (typeof window !== "undefined") localStorage.setItem("onboardingGoal", goal);
    await createCompanyThenContinue();
  }

  async function createCompanyThenContinue() {
    const ok = await saveCompany();
    if (ok && plan === "free") await savePlan();
  }

  async function savePlan() {
    setSaving(true);
    const companyId =
      typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null;

    // Paid plans → redirect to Polar-hosted checkout. Webhook activates the
    // subscription on return (see src/routes/api/public/polar/webhook.ts).
    if (plan === "pro" || plan === "business") {
      const productId = getPolarProductId(plan as "pro" | "business", "monthly");
      if (!productId || !companyId) {
        setSaving(false);
        toast.error("Missing plan configuration");
        return;
      }
      // Record intent as "pending" (not free, not active) so gating helpers
      // have a row to read, but the auth gate keeps this user out of the
      // dashboard until the Polar webhook confirms payment.
      try {
        await createPendingSubscription({ data: { companyId, plan, cycle: "monthly" } });
      } catch (e) {
        setSaving(false);
        toast.error(e instanceof Error ? e.message : "Failed to save plan selection");
        return;
      }
      await supabase.from("onboarding_progress").upsert(
        {
          user_id: user.id,
          financial_completed: true,
          branding_completed: true,
          // Intentionally not "completed" yet — payment isn't done. The
          // ground-truth gate is the subscriptions row, but keep this flag
          // consistent so anything else reading onboarding_progress agrees.
          completed: false,
          current_step: "payment",
        },
        { onConflict: "user_id" },
      );
      if (typeof window !== "undefined") localStorage.removeItem("pendingPlan");
      // Leaves the SPA for the Polar-hosted checkout page and returns to
      // /settings?tab=billing. The server takes the payer from the session.
      try {
        await startPolarCheckout({ productId, companyId });
      } catch (e) {
        setSaving(false);
        toast.error(e instanceof Error ? e.message : "Checkout could not be started");
      }
      return;
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
    // Head straight to what the user said they want to do first (default: dashboard).
    const savedGoal =
      (typeof window !== "undefined" && (localStorage.getItem("onboardingGoal") as Goal | null)) ||
      goal;
    navigate({ to: GOAL_ROUTES[savedGoal] ?? "/dashboard", replace: true });
  }

  const steps = useMemo(
    () => [
      { id: "setup" as const, label: "Your details & company", icon: Building2 },
      { id: "plan" as const, label: "Plan", icon: CreditCard },
    ],
    [],
  );
  const currentIdx = step === "plan" || step === "done" ? 1 : 0;
  const firstName = ((user.user_metadata?.full_name as string | undefined) ?? "")
    .trim()
    .split(" ")[0];

  return (
    <div className="min-h-screen bg-gradient-subtle px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {resuming ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your setup…
          </div>
        ) : (
          <>
            <h1 className="text-center text-3xl font-bold mb-2">
              {firstName ? `Welcome, ${firstName}` : "Welcome to FinFlow Track"}
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              Just your name and company to get started.
            </p>

            <div className="mb-8 flex items-center justify-between">
              {steps.map((s, i) => {
                const active = i === currentIdx;
                const done = currentIdx > i;
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
                    <span className={`text-sm ${active ? "font-medium" : "text-muted-foreground"}`}>
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
                  <h2 className="text-xl font-semibold">Set up your workspace</h2>
                  <div>
                    <Label htmlFor="ob-name">Full name</Label>
                    <Input
                      id="ob-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ob-company">Company name *</Label>
                    <Input
                      id="ob-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Inc."
                      autoComplete="organization"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <CurrencySelect value={companyCurrency} onValueChange={setCompanyCurrency} />
                  </div>

                  <details className="rounded-lg border px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      More company details (optional)
                    </summary>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </details>

                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">
                      What do you want to do first?
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          aria-pressed={goal === g.id}
                          onClick={() => setGoal(g.id)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            goal === g.id
                              ? "border-primary bg-primary/10 font-medium text-primary"
                              : "hover:border-primary/50"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <Button
                    onClick={saveProfileAndCompany}
                    disabled={saving || !fullName.trim() || !companyName.trim()}
                    className="w-full"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {plan === "free" ? "Create my workspace" : "Continue"}{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {plan === "free"
                      ? "You start on the Free plan and can upgrade any time from settings."
                      : "Next: confirm your plan."}
                  </p>
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
                  <Button onClick={createCompanyThenContinue} disabled={saving} className="w-full">
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
                    {PLAN_ORDER.map((key) => {
                      const p = PLANS[key];
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
                              <div className="font-bold">{formatPlanPrice(p)}</div>
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
