import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Circle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

type Counts = { invoices: number; expenses: number; teammates: number };

const GOAL_KEY = "onboardingGoal";

/**
 * Small "get started" checklist for new companies. Progress is computed from real records
 * (invoices, expenses, team), never stored, and the card hides itself once everything is done
 * or when dismissed. If any count cannot be read it renders nothing rather than guess.
 */
export function GettingStartedChecklist() {
  const companyId = useActiveCompanyId();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setDismissed(localStorage.getItem(`gettingStartedDismissed:${companyId}`) === "1");
    let cancelled = false;
    (async () => {
      // biome-ignore lint/suspicious/noExplicitAny: some tables are not in the generated types
      const db = supabase as any;
      const count = async (table: string, extra?: (q: any) => any) => {
        let q = db
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId);
        if (extra) q = extra(q);
        const { count: n, error } = await q;
        if (error) throw error;
        return n ?? 0;
      };
      try {
        const [invoices, expenses, members, invites] = await Promise.all([
          count("invoices"),
          count("expenses"),
          count("company_members", (q) => q.eq("status", "active")),
          count("team_invitations"),
        ]);
        if (!cancelled)
          setCounts({ invoices, expenses, teammates: members > 1 ? members : invites });
      } catch {
        if (!cancelled) setCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!companyId || !counts || dismissed) return null;

  const goal = typeof window !== "undefined" ? localStorage.getItem(GOAL_KEY) : null;
  const items = [
    { id: "company", label: "Create your company", done: true, to: null, goal: "" },
    {
      id: "invoice",
      label: "Create your first invoice",
      done: counts.invoices > 0,
      to: "/invoices" as const,
      goal: "invoice",
    },
    {
      id: "expense",
      label: "Record your first expense",
      done: counts.expenses > 0,
      to: "/expenses" as const,
      goal: "expense",
    },
    {
      id: "team",
      label: "Invite your accountant or a teammate",
      done: counts.teammates > 0,
      to: "/team" as const,
      goal: "",
    },
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  return (
    <section aria-label="Getting started" className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Get started</h2>
          <p className="text-sm text-muted-foreground">
            {doneCount} of {items.length} done
          </p>
        </div>
        <button
          type="button"
          aria-label="Hide the getting started checklist"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            localStorage.setItem(`gettingStartedDismissed:${companyId}`, "1");
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={doneCount}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((i) => {
          const row = (
            <span className="flex items-center gap-3">
              {i.done ? (
                <Check className="h-5 w-5 flex-none text-green-600" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 flex-none text-muted-foreground" aria-hidden="true" />
              )}
              <span className={i.done ? "text-muted-foreground line-through" : "font-medium"}>
                {i.label}
              </span>
              {!i.done && i.goal && goal === i.goal && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Your pick
                </span>
              )}
            </span>
          );
          return (
            <li key={i.id}>
              {i.to && !i.done ? (
                <Link to={i.to} className="block rounded-lg border p-3 hover:border-primary/50">
                  {row}
                </Link>
              ) : (
                <div className="rounded-lg border border-transparent p-3">{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
