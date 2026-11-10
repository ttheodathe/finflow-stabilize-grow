import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Circle, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

type Counts = { customers: number; invoices: number; expenses: number };

type Step = {
  id: "workspace" | "customer" | "invoice" | "expense" | "reports";
  label: string;
  description: string;
  done: boolean;
  to: string | null;
  action: string;
  image: string;
  imageAlt: string;
};

const GOAL_KEY = "onboardingGoal";

/**
 * A visual first-value journey. Database records complete the customer,
 * invoice and expense steps; opening Reports is recorded locally per workspace.
 * No step is completed merely because a user clicks its CTA.
 */
export function GettingStartedChecklist() {
  const companyId = useActiveCompanyId();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [reportsViewed, setReportsViewed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [goal, setGoal] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    setDismissed(localStorage.getItem("gettingStartedDismissed:" + companyId) === "1");
    setReportsViewed(localStorage.getItem("onboardingReportsViewed:" + companyId) === "1");
    setGoal(localStorage.getItem(GOAL_KEY));

    let cancelled = false;
    (async () => {
      const db = supabase as any;
      const count = async (table: string) => {
        const { count: total, error } = await db
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);
        if (error) throw error;
        return total ?? 0;
      };

      try {
        const [customers, invoices, expenses] = await Promise.all([
          count("customers"),
          count("invoices"),
          count("expenses"),
        ]);
        if (!cancelled) setCounts({ customers, invoices, expenses });
      } catch (error) {
        console.error("[onboarding] Could not load getting-started progress:", error);
        if (!cancelled) setCounts(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const steps = useMemo<Step[]>(() => [
    {
      id: "workspace",
      label: "Create your workspace",
      description: "Your company workspace is ready. Next, add someone you do business with.",
      done: Boolean(companyId),
      to: null,
      action: "Workspace ready",
      image: "/onboarding/dashboard.jpg",
      imageAlt: "FinFlow Track dashboard with its getting-started progress card",
    },
    {
      id: "customer",
      label: "Add your first customer",
      description: "Save a customer once, then select them when you prepare an invoice.",
      done: (counts?.customers ?? 0) > 0,
      to: "/customers",
      action: "Add a customer",
      image: "/onboarding/customers.jpg",
      imageAlt: "FinFlow Track customer management screen",
    },
    {
      id: "invoice",
      label: "Create your first invoice",
      description: "Turn the customer details into an invoice you can export or share.",
      done: (counts?.invoices ?? 0) > 0,
      to: "/invoices",
      action: "Create an invoice",
      image: "/onboarding/invoices.jpg",
      imageAlt: "FinFlow Track invoices screen",
    },
    {
      id: "expense",
      label: "Record your first expense",
      description: "Capture a business cost so it can appear in your financial records.",
      done: (counts?.expenses ?? 0) > 0,
      to: "/expenses",
      action: "Record an expense",
      image: "/onboarding/expenses.jpg",
      imageAlt: "FinFlow Track expenses screen",
    },
    {
      id: "reports",
      label: "Explore your reports",
      description: "See how invoices and expenses come together in your financial reports.",
      done: reportsViewed,
      to: "/reports",
      action: "Explore reports",
      image: "/onboarding/reports.jpg",
      imageAlt: "FinFlow Track financial reports screen",
    },
  ], [companyId, counts, reportsViewed]);

  if (!companyId || !counts || dismissed) return null;

  const doneCount = steps.filter((step) => step.done).length;
  const activeIndex = steps.findIndex((step) => !step.done);
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null;
  const preferredStep = goal === "invoice" ? "invoice" : goal === "expense" ? "expense" : goal === "reports" ? "reports" : null;

  return (
    <section aria-label="Your FinFlow Track getting-started journey" className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Your first steps with FinFlow Track</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {doneCount} of {steps.length} steps complete
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss getting-started guide"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              localStorage.setItem("gettingStartedDismissed:" + companyId, "1");
              setDismissed(true);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: (doneCount / steps.length) * 100 + "%" }} />
        </div>

        {activeStep ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Step {activeIndex + 1} of {steps.length}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{activeStep.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeStep.description}</p>
              {activeStep.to && (
                <Link
                  to={activeStep.to as any}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {activeStep.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border bg-muted/30">
              <img
                src={activeStep.image}
                alt={activeStep.imageAlt}
                loading="lazy"
                className="block aspect-[16/9] w-full object-cover object-top"
              />
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                A real view of this area in FinFlow Track
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-primary/5 p-5">
            <p className="font-semibold">You’re ready to put FinFlow Track to work.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You’ve explored the essential workflow: customers, invoices, expenses and reports.
            </p>
            <Link to="/dashboard" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Go to your dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        <ol className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map((step, index) => {
            const isPreferred = preferredStep === step.id && !step.done;
            const content = (
              <span className="flex min-h-[58px] items-center gap-2.5">
                {step.done ? (
                  <Check className="h-4 w-4 flex-none text-green-600" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
                )}
                <span className="min-w-0">
                  <span className={"block text-xs font-medium " + (step.done ? "text-muted-foreground line-through" : "")}>
                    {index + 1}. {step.label}
                  </span>
                  {isPreferred && <span className="mt-0.5 block text-[10px] font-semibold text-primary">Your selected goal</span>}
                </span>
              </span>
            );
            return (
              <li key={step.id} className={"rounded-lg border px-3 py-2 " + (step.id === activeStep?.id ? "border-primary/50 bg-primary/5" : "border-border/70")}>
                {step.to && !step.done ? (
                  <Link to={step.to as any} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {content}
                  </Link>
                ) : content}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
