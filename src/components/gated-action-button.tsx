import { useState } from "react";
import { Lock } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import type { FeatureKey } from "@/lib/features/catalog";

interface GatedActionButtonProps extends Omit<ButtonProps, "onClick"> {
  feature: FeatureKey;
  onAction: () => void;
}

/**
 * Action button (not a link) that is plan-aware: when the feature is not in
 * the current plan the button stays visible with a lock and opens the
 * upgrade modal instead of running the action. Server functions re-check.
 */
export function GatedActionButton({
  feature,
  onAction,
  children,
  ...props
}: GatedActionButtonProps) {
  const { plan, accessTo } = useFeatureGate();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const access = accessTo(feature);

  if (access.allowed) {
    return (
      <Button {...props} onClick={onAction}>
        {children}
      </Button>
    );
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            {...props}
            disabled={false}
            className={`opacity-70 ${props.className ?? ""}`}
            onClick={() => setUpgradeOpen(true)}
          >
            <Lock className="h-4 w-4" /> {children}
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
