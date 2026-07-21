/**
 * Centralized subscription-based feature gating.
 *
 * Client hook (`useSubscriptionLimits`) is used for hiding/disabling UI.
 * Server functions should re-check limits before performing mutations.
 */
import { useQuery } from "@tanstack/react-query";
import { PLANS, type PlanKey, type PlanLimits } from "./paddle/config";
import { getMySubscription } from "./billing.functions";

export type FeatureKey =
  | "inventory"
  | "purchaseOrders"
  | "bankReconciliation"
  | "advancedReports"
  | "payroll"
  | "crm"
  | "projects"
  | "auditLogs"
  | "apiAccess";

export function limitsForPlan(plan: PlanKey): PlanLimits {
  return PLANS[plan]?.limits ?? PLANS.free.limits;
}

export function hasFeature(plan: PlanKey, feature: FeatureKey): boolean {
  return Boolean(limitsForPlan(plan)[feature]);
}

export function canCreateCompany(plan: PlanKey, currentCount: number): boolean {
  return currentCount < limitsForPlan(plan).companyLimit;
}

export function canInviteUser(plan: PlanKey, currentSeats: number): boolean {
  return currentSeats < limitsForPlan(plan).memberLimit;
}

export const canUseInventory = (plan: PlanKey) => hasFeature(plan, "inventory");
export const canUsePayroll = (plan: PlanKey) => hasFeature(plan, "payroll");
export const canUseCRM = (plan: PlanKey) => hasFeature(plan, "crm");
export const canUseProjects = (plan: PlanKey) => hasFeature(plan, "projects");
export const canUseAPI = (plan: PlanKey) => hasFeature(plan, "apiAccess");

export function useSubscriptionLimits(companyId: string | null) {
  const query = useQuery({
    queryKey: ["subscription", companyId],
    queryFn: () => getMySubscription({ data: { companyId: companyId ?? null } }),
    enabled: Boolean(companyId),
    staleTime: 30_000,
  });
  const plan: PlanKey = (query.data?.plan as PlanKey | undefined) ?? "free";
  const limits = limitsForPlan(plan);
  return {
    subscription: query.data,
    plan,
    limits,
    isLoading: query.isLoading,
    can: {
      inventory: canUseInventory(plan),
      payroll: canUsePayroll(plan),
      crm: canUseCRM(plan),
      projects: canUseProjects(plan),
      api: canUseAPI(plan),
      bankReconciliation: hasFeature(plan, "bankReconciliation"),
      advancedReports: hasFeature(plan, "advancedReports"),
      purchaseOrders: hasFeature(plan, "purchaseOrders"),
      auditLogs: hasFeature(plan, "auditLogs"),
    },
    canCreateCompany: (currentCount: number) => canCreateCompany(plan, currentCount),
    canInviteUser: (currentSeats: number) => canInviteUser(plan, currentSeats),
  };
}