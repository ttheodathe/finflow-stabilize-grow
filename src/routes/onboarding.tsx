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

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({ meta: [{ title: "Set up your workspace — FinFlow Track" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    if (!data.user.email_confirmed_at) {
      throw redirect({ to: "/verify-email", search: { email: data.user.email ?? undefined } });
    }
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

  // If onboarding already complete, skip straight to dashboard.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("onboarding_progress")
        .select("completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.completed) navigate({ to: "/dashboard" });
    })();
  }, [user.id, navigate]);

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
    const { error } = await supabase.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan,
        status: "active",
        billing_interval: "monthly",
      },
      { onConflict: "user_id" },
    );
    if (error) {
      // If unique constraint isn't user_id, fall back to insert-if-missing.
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        const { error: e2 } = await supabase
          .from("subscriptions")
          .insert({ user_id: user.id, plan, status: "active", billing_interval: "monthly" });
        if (e2) {
          setSaving(false);
          return toast.error(e2.message);
        }
      } else {
        await supabase.from("subscriptions").update({ plan, status: "active" }).eq("id", existing.id);
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
    toast.success("You're all set!");
    navigate({ to: "/dashboard" });
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
      </div>
    </div>
  );
}