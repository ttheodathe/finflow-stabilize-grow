import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listPartnerApplications } from "@/services/partners/partnerApplications.service";
import { listAllPartners } from "@/services/partners/partners.service";
import { getPartnerAdminAnalytics } from "@/services/partners/partnerAnalytics.service";
import { listApprovedCommissionsByPartner } from "@/services/partners/partnerPayouts.service";
import {
  getProgramSettings,
  listCommissionsForReview,
} from "@/services/partners/partnerProgram.service";
import type { PartnerApplication } from "@/types/partner.types";

export function useIsPlatformStaff() {
  const query = useQuery({
    queryKey: ["is-platform-staff"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_staff");
      if (error) throw error;
      return Boolean(data);
    },
  });
  return { isStaff: query.data ?? false, isLoading: query.isLoading };
}

export function usePartnerApplications(status?: PartnerApplication["status"]) {
  const query = useQuery({
    queryKey: ["partner-applications", status ?? "all"],
    queryFn: () => listPartnerApplications(status),
  });
  return { applications: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function useAllPartners() {
  const query = useQuery({
    queryKey: ["all-partners"],
    queryFn: () => listAllPartners(),
  });
  return { partners: query.data ?? [], isLoading: query.isLoading, error: query.error };
}

export function usePartnerAdminAnalytics() {
  const query = useQuery({
    queryKey: ["partner-admin-analytics"],
    queryFn: getPartnerAdminAnalytics,
  });
  return { analytics: query.data, isLoading: query.isLoading, error: query.error };
}

export function useApprovedCommissionsByPartner() {
  const query = useQuery({
    queryKey: ["approved-commissions-by-partner"],
    queryFn: listApprovedCommissionsByPartner,
  });
  return { grouped: query.data ?? {}, isLoading: query.isLoading, error: query.error };
}

export function useProgramSettings() {
  const query = useQuery({
    queryKey: ["partner-program-settings"],
    queryFn: getProgramSettings,
  });
  return { settings: query.data, isLoading: query.isLoading, error: query.error };
}

export function useCommissionReviewQueue() {
  const query = useQuery({
    queryKey: ["partner-commission-review-queue"],
    queryFn: listCommissionsForReview,
  });
  return { commissions: query.data ?? [], isLoading: query.isLoading, error: query.error };
}
