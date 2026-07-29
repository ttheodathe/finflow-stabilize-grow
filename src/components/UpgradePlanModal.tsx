import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PLANS, type PlanKey } from "@/lib/paddle/config";
import { PlanCheckoutButton } from "./PlanCheckoutButton";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: PlanKey;
}

// Only show upgrade-worthy tiers here — free is a downgrade (not offered
// from this modal) and enterprise routes to "Request demo" via the same
// PlanCheckoutButton component, so it's included for completeness.
const UPGRADE_PLANS: PlanKey[] = ["pro", "business", "enterprise"];

export function UpgradePlanModal({ open, onOpenChange, currentPlan }: UpgradePlanModalProps) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const options = UPGRADE_PLANS.filter((k) => k !== currentPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upgrade your plan</DialogTitle>
          <DialogDescription>
            Pick a plan to unlock more companies, team members, and features.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1 text-xs">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded px-3 py-1 font-medium ${
                cycle === "monthly" ? "bg-gray-900 text-white" : "text-gray-500"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`rounded px-3 py-1 font-medium ${
                cycle === "yearly" ? "bg-gray-900 text-white" : "text-gray-500"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((k) => {
            const p = PLANS[k];
            const price =
              k === "enterprise"
                ? "Custom"
                : cycle === "monthly"
                  ? `$${p.priceMonthly}/mo`
                  : `$${p.priceYearly}/yr`;
            return (
              <div key={k} className="flex flex-col rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900">{p.name}</h3>
                <div className="mt-1 text-lg font-semibold text-gray-900">{price}</div>
                <ul className="mt-2 flex-1 space-y-1 text-xs text-gray-600">
                  {p.features.slice(0, 4).map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <PlanCheckoutButton
                  plan={k}
                  cycle={cycle}
                  className="mt-3 w-full rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
                >
                  {k === "enterprise" ? "Request demo" : `Choose ${p.name}`}
                </PlanCheckoutButton>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> 5959176 (Update Polar config and sitemap)
