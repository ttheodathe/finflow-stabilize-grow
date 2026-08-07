export type PartnerType =
  | "affiliate"
  | "bookkeeping_firm"
  | "accounting_firm"
  | "accountant"
  | "tax_consultant"
  | "educator"
  | "influencer"
  | "reseller";

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  affiliate: "Affiliate",
  bookkeeping_firm: "Bookkeeping Firm",
  accounting_firm: "Accounting Firm",
  accountant: "Accountant",
  tax_consultant: "Tax Consultant",
  educator: "Educator",
  influencer: "Influencer",
  reseller: "Reseller",
};

export type PartnerApplicationStatus = "pending" | "approved" | "rejected" | "needs_more_info";
export type PartnerStatus = "active" | "suspended" | "banned";
export type PartnerCommissionStatus =
  "pending" | "approved" | "rejected" | "paid" | "cancelled" | "reversed";

export interface PartnerApplication {
  id: string;
  user_id: string | null;
  status: PartnerApplicationStatus;
  partner_type: PartnerType;
  business_name: string;
  website: string | null;
  country: string;
  industry: string | null;
  business_type: string | null;
  linkedin_url: string | null;
  contact_email: string;
  phone: string | null;
  monthly_audience: string | null;
  approx_clients: string | null;
  motivation: string | null;
  experience: string | null;
  marketing_channels: string[] | null;
  terms_accepted: boolean;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: string;
  user_id: string;
  application_id: string | null;
  partner_type: PartnerType;
  status: PartnerStatus;
  business_name: string;
  referral_code: string;
  commission_rate: number;
  payout_email: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerReferralClick {
  id: string;
  partner_id: string;
  visitor_id: string;
  landing_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  created_at: string;
}

export interface PartnerReferralAttribution {
  id: string;
  company_id: string;
  referred_user_id: string;
  first_touch_partner_id: string | null;
  last_touch_partner_id: string;
  visitor_id: string | null;
  attributed_at: string;
}

export interface PartnerCommission {
  id: string;
  partner_id: string;
  company_id: string;
  source_order_id: string;
  status: PartnerCommissionStatus;
  billed_amount: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  tier: number;
  flagged_for_review: boolean;
  flag_reason: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerDashboardStats {
  totalClicks: number;
  uniqueVisitors: number;
  totalSignups: number;
  pendingCommissions: number;
  approvedCommissions: number;
  paidCommissions: number;
  lifetimeEarnings: number;
  currency: string;
}

export class PartnerServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PartnerServiceError";
    this.code = code;
  }
}
