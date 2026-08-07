import { useQuery } from "@tanstack/react-query";
import {
  getMyPartnerRecord,
  getPartnerDashboardStats,
  listPartnerCommissions,
} from "@/services/partners/partners.service";
import { listPartnerPayouts } from "@/services/partners/partnerPayouts.service";
import { listApiKeys } from "@/services/partners/partnerApiKeys.service";

export function useMyPartner() {
  const query = useQuery({
    queryKey: ["partner", "me"],
    queryFn: getMyPartnerRecord,
  });
  return { partner: query.data ?? null, isLoading: query.isLoading, error: query.error };
}

export function usePartnerDashboardStats(partnerId: string | undefined) {
  const query = useQuery({
    queryKey: ["partner-dashboard-stats", partnerId],
    enabled: Boolean(partnerId),
    queryFn: () => getPartnerDashboardStats(partnerId as string),
  });
  return { stats: query.data, isLoading: query.isLoading, error: query.error };
}

export function usePartnerCommissions(partnerId: string | undefined) {
  const query = useQuery({
    queryKey: ["partner-commissions", partnerId],
    enabled: Boolean(partnerId),
    queryFn: () => listPartnerCommissions(partnerId as string),
  });
  return { commissions: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function usePartnerPayouts(partnerId: string | undefined) {
  const query = useQuery({
    queryKey: ["partner-payouts", partnerId],
    enabled: Boolean(partnerId),
    queryFn: () => listPartnerPayouts(partnerId as string),
  });
  return { payouts: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function usePartnerApiKeys(partnerId: string | undefined) {
  const query = useQuery({
    queryKey: ["partner-api-keys", partnerId],
    enabled: Boolean(partnerId),
    queryFn: () => listApiKeys(partnerId as string),
  });
  return { apiKeys: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
