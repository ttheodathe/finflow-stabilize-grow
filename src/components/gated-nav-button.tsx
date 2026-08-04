import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";
import { useFeatureGate } from "@/hooks/useFeatureGate";

interface GatedNavButtonProps extends Omit<ButtonProps, "asChild" | "onClick"> {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Module-launcher button that is plan-aware: when the destination module is
 * not included in the current plan it stays visible but shows a lock, a
 * tooltip naming the required plan, and opens the upgrade modal on click
 * instead of navigating.
 */
export function GatedNavButton({ to, label, icon: Icon, ...props }: GatedNavButtonProps) {
  const { plan, accessToRoute } = useFeatureGate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const access = accessToRoute(to);

  if (access.allowed) {
    return (
      <Button asChild {...props}>
        <Link to={to}>
          {Icon && <Icon className="h-4 w-4" />} {label}
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            aria-label={`${label} — requires the ${access.requiredPlanName} plan`}
            className={`opacity-70 ${props.className ?? ""}`}
            onClick={() => setUpgradeOpen(true)}
          >
            <Lock className="h-4 w-4" /> {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {access.label} is available on the {access.requiredPlanName} plan — click to upgrade.
        </TooltipContent>
      </Tooltip>
      <UpgradePlanModal open={upgradeOpen} onOpenChange={setUpgradeOpen} currentPlan={plan} />
    </>
  );
}