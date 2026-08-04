import { useCallback } from "react";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useSubscriptionLimits } from "@/lib/subscription-limits";
import type { PlanKey } from "@/lib/paddle/config";
import {
  FEATURES,
  featureForRoute,
  planHasFeature,
  requiredPlanFor,
  requiredPlanName,
  type FeatureKey,
} from "@/lib/features/catalog";

export interface FeatureAccess {
  allowed: boolean;
  feature: FeatureKey | null;
  label: string | null;
  requiredPlan: PlanKey | null;
  requiredPlanName: string | null;
}

const OPEN: FeatureAccess = {
  allowed: true,
  feature: null,
  label: null,
  requiredPlan: null,
  requiredPlanName: null,
};

/**
 * Plan-aware gating for navigation and module launchers.
 *
 * UX only: locked entries stay visible and route the click to the upgrade
 * modal instead of navigating. Server functions still enforce the real rule.
 */
export function useFeatureGate() {
  const companyId = useActiveCompanyId();
  const { plan, isLoading } = useSubscriptionLimits(companyId);

  const accessTo = useCallback(
    (feature: FeatureKey | null): FeatureAccess => {
      if (!feature) return OPEN;
      if (planHasFeature(plan, feature)) return OPEN;
      return {
        allowed: false,
        feature,
        label: FEATURES[feature].label,
        requiredPlan: requiredPlanFor(feature),
        requiredPlanName: requiredPlanName(feature),
      };
    },
    [plan],
  );

  const accessToRoute = useCallback(
    (path: string): FeatureAccess => accessTo(featureForRoute(path)),
    [accessTo],
  );

  return { plan, isLoading, accessTo, accessToRoute };
}