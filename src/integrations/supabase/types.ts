export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          parent_id: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          parent_id?: string | null
          type: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          parent_id?: string | null
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      billing_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_url: string | null
          organization_id: string
          payment_provider: string | null
          period_end: string | null
          period_start: string | null
          plan_key: string | null
          provider_reference: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          organization_id: string
          payment_provider?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_key?: string | null
          provider_reference?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_url?: string | null
          organization_id?: string
          payment_provider?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_key?: string | null
          provider_reference?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["company_member_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["company_member_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["company_member_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["company_member_role"]
          status?: Database["public"]["Enums"]["company_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["company_member_role"]
          status?: Database["public"]["Enums"]["company_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          bill_next_number: number
          bill_prefix: string
          company_id: string
          created_at: string
          date_format: string
          default_invoice_notes: string | null
          default_payment_terms_days: number
          estimate_next_number: number
          estimate_prefix: string
          fiscal_year_start_month: number
          invoice_next_number: number
          invoice_prefix: string
          notify_invoice_overdue: boolean
          notify_payment_received: boolean
          notify_weekly_summary: boolean
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          bill_next_number?: number
          bill_prefix?: string
          company_id: string
          created_at?: string
          date_format?: string
          default_invoice_notes?: string | null
          default_payment_terms_days?: number
          estimate_next_number?: number
          estimate_prefix?: string
          fiscal_year_start_month?: number
          invoice_next_number?: number
          invoice_prefix?: string
          notify_invoice_overdue?: boolean
          notify_payment_received?: boolean
          notify_weekly_summary?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          bill_next_number?: number
          bill_prefix?: string
          company_id?: string
          created_at?: string
          date_format?: string
          default_invoice_notes?: string | null
          default_payment_terms_days?: number
          estimate_next_number?: number
          estimate_prefix?: string
          fiscal_year_start_month?: number
          invoice_next_number?: number
          invoice_prefix?: string
          notify_invoice_overdue?: boolean
          notify_payment_received?: boolean
          notify_weekly_summary?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_tax_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          is_inclusive: boolean
          name: string
          rate: number
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_inclusive?: boolean
          name: string
          rate?: number
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_inclusive?: boolean
          name?: string
          rate?: number
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          branding_completed: boolean
          company_completed: boolean
          completed: boolean
          completed_at: string | null
          created_at: string
          current_step: string
          financial_completed: boolean
          profile_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          branding_completed?: boolean
          company_completed?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: string
          financial_completed?: boolean
          profile_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          branding_completed?: boolean
          company_completed?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: string
          financial_completed?: boolean
          profile_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_invoice_overdue: boolean
          email_payment_received: boolean
          email_product_updates: boolean
          email_security_alerts: boolean
          email_weekly_summary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_invoice_overdue?: boolean
          email_payment_received?: boolean
          email_product_updates?: boolean
          email_security_alerts?: boolean
          email_weekly_summary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_invoice_overdue?: boolean
          email_payment_received?: boolean
          email_product_updates?: boolean
          email_security_alerts?: boolean
          email_weekly_summary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          owner_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          owner_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          status: Database["public"]["Enums"]["org_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          status?: Database["public"]["Enums"]["org_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          status?: Database["public"]["Enums"]["org_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["org_member_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_member_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_member_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      plan_limits: {
        Row: {
          created_at: string
          id: string
          limit_key: string
          limit_value: number
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          limit_key: string
          limit_value: number
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          limit_key?: string
          limit_value?: number
          organization_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          company_id: string | null
          feature_key: string
          id: string
          organization_id: string
          period_end: string | null
          period_start: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          company_id?: string | null
          feature_key: string
          id?: string
          organization_id: string
          period_end?: string | null
          period_start?: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          company_id?: string | null
          feature_key?: string
          id?: string
          organization_id?: string
          period_end?: string | null
          period_start?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_currency: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          key: string
          max_companies: number
          max_users: number
          name: string
          price_annual: number
          price_monthly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          key: string
          max_companies?: number
          max_users?: number
          name: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          key?: string
          max_companies?: number
          max_users?: number
          name?: string
          price_annual?: number
          price_monthly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string
          company_limit: number | null
          created_at: string
          current_period_end: string | null
          id: string
          organization_id: string | null
          plan: string
          plan_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          company_limit?: number | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string | null
          plan?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          company_limit?: number | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string | null
          plan?: string
          plan_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          last_active_at: string
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          created_at: string
          currency: string
          date_format: string
          default_invoice_notes: string | null
          default_payment_terms_days: number
          invoice_next_number: number
          invoice_prefix: string
          logo_url: string | null
          notify_invoice_overdue: boolean
          notify_payment_received: boolean
          notify_weekly_summary: boolean
          theme: string
          timezone: string
          updated_at: string
          user_id: string
          workspace_name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          date_format?: string
          default_invoice_notes?: string | null
          default_payment_terms_days?: number
          invoice_next_number?: number
          invoice_prefix?: string
          logo_url?: string | null
          notify_invoice_overdue?: boolean
          notify_payment_received?: boolean
          notify_weekly_summary?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
          workspace_name?: string
        }
        Update: {
          created_at?: string
          currency?: string
          date_format?: string
          default_invoice_notes?: string | null
          default_payment_terms_days?: number
          invoice_next_number?: number
          invoice_prefix?: string
          logo_url?: string | null
          notify_invoice_overdue?: boolean
          notify_payment_received?: boolean
          notify_weekly_summary?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
          workspace_name?: string
        }
        Relationships: []
      }
      customers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      invoices: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      invoice_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      expenses: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      item_categories: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      journal_entries: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      journal_lines: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      estimates: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      estimate_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      recurring_invoices: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      credit_notes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      payments: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      vendors: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      bills: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      bill_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      bill_payments: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      purchase_orders: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      purchase_order_items: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      bank_accounts: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      bank_transfers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      bank_transactions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
      stock_movements: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_company_invitation: {
        Args: { p_token: string }
        Returns: Database["public"]["Tables"]["company_members"]["Row"]
      }
      accept_organization_invitation: {
        Args: { _token: string }
        Returns: string
      }
      apply_invoice_stock:
        | { Args: { _direction: number; _invoice_id: string }; Returns: undefined }
        | { Args: { _direction: number; _invoice_id: string; _reason?: string }; Returns: undefined }
      check_feature_limit: {
        Args: { p_company_id: string; p_feature_key: string }
        Returns: boolean
      }
      create_bank_transfer: {
        Args: {
          _amount: number
          _from_account_id: string
          _notes?: string
          _to_account_id: string
          _transfer_date?: string
        }
        Returns: string
      }
      create_company: {
        Args: {
          p_address?: string
          p_city?: string
          p_country?: string
          p_currency?: string
          p_email?: string
          p_name: string
          p_organization_id?: string
          p_phone?: string
          p_postal_code?: string
          p_state?: string
          p_tax_number?: string
          p_website?: string
        }
        Returns: Database["public"]["Tables"]["companies"]["Row"]
      }
      find_account: {
        Args: { _code: string; _user_id: string }
        Returns: string
      }
      get_company_role: {
        Args: { p_company_id: string }
        Returns: Database["public"]["Enums"]["company_member_role"]
      }
      get_my_access_status: { Args: Record<string, never>; Returns: Json }
      increment_feature_usage: {
        Args: { p_company_id: string; p_feature_key: string }
        Returns: undefined
      }
      invite_company_member: {
        Args: {
          p_company_id: string
          p_email: string
          p_role?: Database["public"]["Enums"]["company_member_role"]
        }
        Returns: Database["public"]["Tables"]["company_invitations"]["Row"]
      }
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_mate: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      post_bill_journal: { Args: { _bill_id: string }; Returns: undefined }
      post_bill_payment_journal: { Args: { _pay_id: string }; Returns: undefined }
      post_credit_note_journal: { Args: { _cn_id: string }; Returns: undefined }
      post_payment_journal: { Args: { _payment_id: string }; Returns: undefined }
      recalc_bill_status: { Args: { _bill_id: string }; Returns: undefined }
      recalc_invoice_status: { Args: { _invoice_id: string }; Returns: undefined }
      seed_default_accounts: { Args: { _user_id: string }; Returns: undefined }
      update_own_plan: {
        Args: { new_interval?: string; new_plan: string }
        Returns: Database["public"]["Tables"]["subscriptions"]["Row"]
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      bank_account_type: "bank" | "cash" | "credit_card"
      company_member_role:
        | "owner"
        | "admin"
        | "accountant"
        | "sales"
        | "inventory"
        | "hr"
        | "payroll"
        | "viewer"
      company_member_status: "active" | "invited" | "suspended"
      org_member_role: "owner" | "admin" | "member"
      org_member_status: "active" | "invited" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      bank_account_type: ["bank", "cash", "credit_card"],
      company_member_role: [
        "owner",
        "admin",
        "accountant",
        "sales",
        "inventory",
        "hr",
        "payroll",
        "viewer",
      ],
      company_member_status: ["active", "invited", "suspended"],
      org_member_role: ["owner", "admin", "member"],
      org_member_status: ["active", "invited", "suspended"],
    },
  },
} as const;
