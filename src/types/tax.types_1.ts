export type TaxFilingFrequency = "monthly" | "quarterly" | "annually";
export type TaxPeriodStatus = "open" | "closed" | "filed";
export type TaxReturnStatus = "draft" | "in_review" | "submitted" | "accepted" | "rejected";
export type TaxLineSourceType = "invoice" | "expense" | "bill" | "manual";
export type TaxLineDirection = "output" | "input";
export type TaxDocumentType = "filing_export" | "receipt" | "confirmation" | "supporting";
export type TaxDeadlineStatus = "upcoming" | "due_soon" | "overdue" | "completed";

export interface TaxSetting {
  id: string;
  company_id: string;
  name: string;
  rate: number;
  is_default: boolean;
  is_inclusive: boolean;
  tax_number: string | null;
  jurisdiction: string | null;
  authority_name: string | null;
  filing_frequency: TaxFilingFrequency;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxPeriod {
  id: string;
  company_id: string;
  tax_setting_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  status: TaxPeriodStatus;
  created_at: string;
  updated_at: string;
}

export interface TaxReturn {
  id: string;
  company_id: string;
  tax_period_id: string;
  tax_type: string;
  status: TaxReturnStatus;
  taxable_sales: number;
  taxable_purchases: number;
  output_tax: number;
  input_tax: number;
  net_tax_due: number;
  reference_number: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined relations, populated by the service layer
  tax_period?: TaxPeriod;
}

export interface TaxReturnLine {
  id: string;
  return_id: string;
  company_id: string;
  source_type: TaxLineSourceType;
  source_id: string | null;
  account_id: string | null;
  description: string | null;
  taxable_amount: number;
  tax_amount: number;
  direction: TaxLineDirection;
  created_at: string;
}

export interface TaxPayment {
  id: string;
  return_id: string;
  company_id: string;
  amount: number;
  currency: string;
  paid_date: string;
  method: string;
  reference: string | null;
  source_account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxDocument {
  id: string;
  return_id: string;
  company_id: string;
  doc_type: TaxDocumentType;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface TaxDeadline {
  id: string;
  company_id: string;
  tax_setting_id: string | null;
  title: string;
  tax_type: string;
  due_date: string;
  reminder_days_before: number;
  is_recurring: boolean;
  status: TaxDeadlineStatus;
  tax_return_id: string | null;
  created_at: string;
  updated_at: string;
}

export class TaxServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "TaxServiceError";
    this.code = code;
  }
}

export interface TaxDashboardSummary {
  activeSettings: number;
  openReturns: number;
  netTaxDueThisPeriod: number;
  nextDeadline: TaxDeadline | null;
  overdueCount: number;
}
