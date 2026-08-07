import { supabase } from "@/integrations/supabase/client";
import {
  PartnerServiceError,
  type PartnerApplication,
  type PartnerType,
} from "@/types/partner.types";

export interface SubmitPartnerApplicationInput {
  partnerType: PartnerType;
  businessName: string;
  website?: string;
  country: string;
  industry?: string;
  businessType?: string;
  linkedinUrl?: string;
  contactEmail: string;
  phone?: string;
  monthlyAudience?: string;
  approxClients?: string;
  motivation?: string;
  experience?: string;
  marketingChannels?: string[];
  termsAccepted: boolean;
}

// Public — callable from anon or authenticated context. No companyId scoping
// here on purpose: partner applications are a platform-level concept, not a
// tenant-company one, unlike every other service in this codebase.
export async function submitPartnerApplication(
  input: SubmitPartnerApplicationInput,
): Promise<PartnerApplication> {
  if (!input.termsAccepted) {
    throw new PartnerServiceError(
      "TERMS_NOT_ACCEPTED",
      "You must accept the partner terms to apply.",
    );
  }

  const { data: userData } = await supabase.auth.getUser();

  const payload = {
    user_id: userData.user?.id ?? null,
    partner_type: input.partnerType,
    business_name: input.businessName,
    website: input.website ?? null,
    country: input.country,
    industry: input.industry ?? null,
    business_type: input.businessType ?? null,
    linkedin_url: input.linkedinUrl ?? null,
    contact_email: input.contactEmail,
    phone: input.phone ?? null,
    monthly_audience: input.monthlyAudience ?? null,
    approx_clients: input.approxClients ?? null,
    motivation: input.motivation ?? null,
    experience: input.experience ?? null,
    marketing_channels: input.marketingChannels ?? null,
    terms_accepted: input.termsAccepted,
  };

  const { data, error } = await supabase
    .from("partner_applications")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new PartnerServiceError("SUBMIT_APPLICATION_FAILED", error.message);
  return data as PartnerApplication;
}

// Staff-only listing/review — RLS restricts this to is_platform_staff().
export async function listPartnerApplications(
  status?: PartnerApplication["status"],
): Promise<PartnerApplication[]> {
  let query = supabase
    .from("partner_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new PartnerServiceError("FETCH_APPLICATIONS_FAILED", error.message);
  return (data ?? []) as PartnerApplication[];
}

// Best-effort — a notification email should never block the admin action
// that already succeeded via the RPC above.
async function notifyApplicant(applicationId: string): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    await fetch("/api/partners/notify-application", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ applicationId }),
    });
  } catch {
    // Swallow — see function docstring.
  }
}

export async function approvePartnerApplication(applicationId: string, commissionRate = 20) {
  const { data, error } = await supabase.rpc("approve_partner_application", {
    p_application_id: applicationId,
    p_commission_rate: commissionRate,
  });
  if (error) throw new PartnerServiceError("APPROVE_APPLICATION_FAILED", error.message);
  void notifyApplicant(applicationId);
  return data;
}

export async function rejectPartnerApplication(applicationId: string, adminNotes?: string | null) {
  const { data, error } = await supabase.rpc("set_partner_application_status", {
    p_application_id: applicationId,
    p_status: "rejected",
    p_admin_notes: adminNotes ?? undefined,
  });
  if (error) throw new PartnerServiceError("REJECT_APPLICATION_FAILED", error.message);
  void notifyApplicant(applicationId);
  return data;
}

export async function requestMoreInfo(applicationId: string, adminNotes: string) {
  const { data, error } = await supabase.rpc("set_partner_application_status", {
    p_application_id: applicationId,
    p_status: "needs_more_info",
    p_admin_notes: adminNotes,
  });
  if (error) throw new PartnerServiceError("REQUEST_INFO_FAILED", error.message);
  void notifyApplicant(applicationId);
  return data;
}
