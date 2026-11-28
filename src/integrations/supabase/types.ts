export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
        Relationships: [
          {
            foreignKeyName: "accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          body: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          deal_id: string | null
          due_at: string | null
          id: string
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          due_at?: string | null
          id?: string
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deal_id?: string | null
          due_at?: string | null
          id?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_review_queue: {
        Row: {
          company_id: string
          confidence: number
          created_at: string
          id: string
          proposed: Json
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_id: string
          source_table: string
          status: string
          task_type: string
          user_id: string
        }
        Insert: {
          company_id: string
          confidence: number
          created_at?: string
          id?: string
          proposed: Json
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id: string
          source_table: string
          status?: string
          task_type: string
          user_id: string
        }
        Update: {
          company_id?: string
          confidence?: number
          created_at?: string
          id?: string
          proposed?: Json
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string
          source_table?: string
          status?: string
          task_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_review_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number_last4: string | null
          company_id: string
          created_at: string
          currency: string
          current_balance: number
          gl_account_id: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number_last4?: string | null
          company_id: string
          created_at?: string
          currency?: string
          current_balance?: number
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number_last4?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          current_balance?: number
          gl_account_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          ai_confidence: number | null
          amount: number
          bank_account_id: string
          bank_transfer_id: string | null
          category_account_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          import_batch: string | null
          is_transfer: boolean
          matched_id: string | null
          matched_type: string | null
          reconciled: boolean
          reconciled_at: string | null
          reference: string | null
          txn_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          amount: number
          bank_account_id: string
          bank_transfer_id?: string | null
          category_account_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          import_batch?: string | null
          is_transfer?: boolean
          matched_id?: string | null
          matched_type?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          txn_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          amount?: number
          bank_account_id?: string
          bank_transfer_id?: string | null
          category_account_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          import_batch?: string | null
          is_transfer?: boolean
          matched_id?: string | null
          matched_type?: string | null
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          txn_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_bank_transfer_id_fkey"
            columns: ["bank_transfer_id"]
            isOneToOne: false
            referencedRelation: "bank_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_category_account_id_fkey"
            columns: ["category_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transfers: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          from_account_id: string
          id: string
          notes: string | null
          to_account_id: string
          transfer_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          from_account_id: string
          id?: string
          notes?: string | null
          to_account_id: string
          transfer_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          from_account_id?: string
          id?: string
          notes?: string | null
          to_account_id?: string
          transfer_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_items: {
        Row: {
          account_id: string | null
          amount: number
          bill_id: string
          company_id: string
          created_at: string
          description: string
          id: string
          item_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          bill_id: string
          company_id: string
          created_at?: string
          description: string
          id?: string
          item_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          bill_id?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          item_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          amount: number
          base_currency_amount: number | null
          bill_id: string
          company_id: string
          created_at: string
          currency: string
          exchange_rate: number
          id: string
          method: string
          notes: string | null
          payment_date: string
          reference: string | null
          source_account_id: string | null
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount: number
          base_currency_amount?: number | null
          bill_id: string
          company_id: string
          created_at?: string
          currency?: string
          exchange_rate?: number
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          source_account_id?: string | null
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          base_currency_amount?: number | null
          bill_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          exchange_rate?: number
          id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          source_account_id?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          paddle_event_id: string | null
          payload: Json
          polar_event_id: string | null
          processed: boolean
          source: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          paddle_event_id?: string | null
          payload: Json
          polar_event_id?: string | null
          processed?: boolean
          source?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          paddle_event_id?: string | null
          payload?: Json
          polar_event_id?: string | null
          processed?: boolean
          source?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          base_currency_amount: number | null
          bill_number: string
          company_id: string
          created_at: string
          currency: string
          due_date: string | null
          exchange_rate: number
          id: string
          issue_date: string
          notes: string | null
          reference: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          base_currency_amount?: number | null
          bill_number: string
          company_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          issue_date?: string
          notes?: string | null
          reference?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          base_currency_amount?: number | null
          bill_number?: string
          company_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          issue_date?: string
          notes?: string | null
          reference?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          inbound_email_token: string
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
          inbound_email_token?: string
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
          inbound_email_token?: string
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
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          role_id: string
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
          role_id: string
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
          role_id?: string
          status?: Database["public"]["Enums"]["company_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tax_settings: {
        Row: {
          authority_name: string | null
          company_id: string
          created_at: string
          filing_frequency: string
          id: string
          is_active: boolean
          is_default: boolean
          is_inclusive: boolean
          jurisdiction: string | null
          name: string
          rate: number
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          authority_name?: string | null
          company_id: string
          created_at?: string
          filing_frequency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_inclusive?: boolean
          jurisdiction?: string | null
          name: string
          rate?: number
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          authority_name?: string | null
          company_id?: string
          created_at?: string
          filing_frequency?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          is_inclusive?: boolean
          jurisdiction?: string | null
          name?: string
          rate?: number
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tax_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          base_currency_amount: number | null
          company_id: string
          created_at: string
          credit_note_number: string
          currency: string
          customer_id: string | null
          exchange_rate: number
          id: string
          invoice_id: string
          issue_date: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          base_currency_amount?: number | null
          company_id: string
          created_at?: string
          credit_note_number: string
          currency?: string
          customer_id?: string | null
          exchange_rate?: number
          id?: string
          invoice_id: string
          issue_date?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          base_currency_amount?: number | null
          company_id?: string
          created_at?: string
          credit_note_number?: string
          currency?: string
          customer_id?: string | null
          exchange_rate?: number
          id?: string
          invoice_id?: string
          issue_date?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          lifecycle_stage: string
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source: string | null
          tags: string[]
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          lifecycle_stage?: string
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[]
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          lifecycle_stage?: string
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source?: string | null
          tags?: string[]
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          company_id: string
          converted_at: string | null
          created_at: string
          currency: string
          customer_id: string | null
          expected_close_date: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          owner_id: string | null
          stage: string
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          converted_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          owner_id?: string | null
          stage?: string
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          converted_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          owner_id?: string | null
          stage?: string
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          cost_center_account_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          cost_center_account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          cost_center_account_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_cost_center_account_id_fkey"
            columns: ["cost_center_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          confidence: number
          created_at: string
          document_id: string
          field_group: string
          field_name: string
          field_value: string | null
          id: string
          line_index: number | null
          was_edited_by_user: boolean
        }
        Insert: {
          confidence?: number
          created_at?: string
          document_id: string
          field_group: string
          field_name: string
          field_value?: string | null
          id?: string
          line_index?: number | null
          was_edited_by_user?: boolean
        }
        Update: {
          confidence?: number
          created_at?: string
          document_id?: string
          field_group?: string
          field_name?: string
          field_value?: string | null
          id?: string
          line_index?: number | null
          was_edited_by_user?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_validations: {
        Row: {
          check_name: string
          created_at: string
          document_id: string
          id: string
          message: string
          severity: string
        }
        Insert: {
          check_name: string
          created_at?: string
          document_id: string
          id?: string
          message: string
          severity: string
        }
        Update: {
          check_name?: string
          created_at?: string
          document_id?: string
          id?: string
          message?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_validations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          ai_model: string | null
          company_id: string
          created_at: string
          doc_type: string
          error_message: string | null
          extracted_at: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id: string
          linked_id: string | null
          linked_table: string | null
          mime_type: string
          overall_confidence: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          ai_model?: string | null
          company_id: string
          created_at?: string
          doc_type: string
          error_message?: string | null
          extracted_at?: string | null
          file_name: string
          file_path: string
          file_size_bytes: number
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type: string
          overall_confidence?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          ai_model?: string | null
          company_id?: string
          created_at?: string
          doc_type?: string
          error_message?: string | null
          extracted_at?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number
          id?: string
          linked_id?: string | null
          linked_table?: string | null
          mime_type?: string
          overall_confidence?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          employee_number: string | null
          employment_status: string
          employment_type: string
          first_name: string
          hire_date: string
          id: string
          job_title: string | null
          last_name: string
          linked_user_id: string | null
          manager_id: string | null
          national_id: string | null
          notes: string | null
          pay_frequency: string
          phone: string | null
          salary: number
          salary_currency: string
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          employee_number?: string | null
          employment_status?: string
          employment_type?: string
          first_name: string
          hire_date?: string
          id?: string
          job_title?: string | null
          last_name: string
          linked_user_id?: string | null
          manager_id?: string | null
          national_id?: string | null
          notes?: string | null
          pay_frequency?: string
          phone?: string | null
          salary?: number
          salary_currency?: string
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string | null
          employee_number?: string | null
          employment_status?: string
          employment_type?: string
          first_name?: string
          hire_date?: string
          id?: string
          job_title?: string | null
          last_name?: string
          linked_user_id?: string | null
          manager_id?: string | null
          national_id?: string | null
          notes?: string | null
          pay_frequency?: string
          phone?: string | null
          salary?: number
          salary_currency?: string
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          estimate_id: string
          id: string
          item_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
          user_id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description: string
          estimate_id: string
          id?: string
          item_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          estimate_id?: string
          id?: string
          item_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          company_id: string
          converted_invoice_id: string | null
          created_at: string
          currency: string
          customer_id: string | null
          estimate_number: string
          expiry_date: string | null
          id: string
          issue_date: string
          notes: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          converted_invoice_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          estimate_number: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          converted_invoice_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string | null
          estimate_number?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          base_currency_amount: number | null
          category: string | null
          company_id: string
          created_at: string
          currency: string
          description: string | null
          exchange_rate: number
          expense_date: string
          id: string
          supplier_invoice_number: string | null
          updated_at: string
          user_id: string
          vendor: string | null
          vendor_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount?: number
          base_currency_amount?: number | null
          category?: string | null
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number
          expense_date?: string
          id?: string
          supplier_invoice_number?: string | null
          updated_at?: string
          user_id: string
          vendor?: string | null
          vendor_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          base_currency_amount?: number | null
          category?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number
          expense_date?: string
          id?: string
          supplier_invoice_number?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_email_events: {
        Row: {
          company_id: string | null
          created_at: string
          detail: string | null
          document_ids: string[]
          email_id: string
          id: string
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          detail?: string | null
          document_ids?: string[]
          email_id: string
          id?: string
          status?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          detail?: string | null
          document_ids?: string[]
          email_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_email_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          company_id: string
          created_at: string
          id: string
          item_id: string
          location_id: string | null
          quantity_available: number | null
          quantity_incoming: number
          quantity_on_hand: number
          quantity_reserved: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          item_id: string
          location_id?: string | null
          quantity_available?: number | null
          quantity_incoming?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          item_id?: string
          location_id?: string | null
          quantity_available?: number | null
          quantity_incoming?: number
          quantity_on_hand?: number
          quantity_reserved?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string
          id: string
          invoice_id: string
          item_id: string | null
          quantity: number
          tax_rate: number
          unit_price: number
          user_id: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          item_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          item_id?: string | null
          quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_followups: {
        Row: {
          channel: string
          company_id: string
          contacted_at: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          note: string | null
        }
        Insert: {
          channel: string
          company_id: string
          contacted_at: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          note?: string | null
        }
        Update: {
          channel?: string
          company_id?: string
          contacted_at?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_followups_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          base_currency_amount: number | null
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string | null
          exchange_rate: number
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          sent_at: string | null
          share_token: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_currency_amount?: number | null
          company_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          sent_at?: string | null
          share_token?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_currency_amount?: number | null
          company_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          sent_at?: string | null
          share_token?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      item_categories: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          cogs_account_id: string | null
          company_id: string
          cost: number
          created_at: string
          currency: string
          default_warehouse_id: string | null
          description: string | null
          id: string
          inventory_account_id: string | null
          is_active: boolean
          lead_time_days: number
          max_stock: number | null
          name: string
          parent_item_id: string | null
          price: number
          qr_code_value: string | null
          reorder_level: number
          revenue_account_id: string | null
          safety_stock: number
          sku: string | null
          stock_quantity: number
          tax_rate: number
          track_inventory: boolean
          type: string
          unit: string | null
          uom_id: string | null
          updated_at: string
          user_id: string
          variant_attributes: Json
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cogs_account_id?: string | null
          company_id: string
          cost?: number
          created_at?: string
          currency?: string
          default_warehouse_id?: string | null
          description?: string | null
          id?: string
          inventory_account_id?: string | null
          is_active?: boolean
          lead_time_days?: number
          max_stock?: number | null
          name: string
          parent_item_id?: string | null
          price?: number
          qr_code_value?: string | null
          reorder_level?: number
          revenue_account_id?: string | null
          safety_stock?: number
          sku?: string | null
          stock_quantity?: number
          tax_rate?: number
          track_inventory?: boolean
          type?: string
          unit?: string | null
          uom_id?: string | null
          updated_at?: string
          user_id: string
          variant_attributes?: Json
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cogs_account_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          currency?: string
          default_warehouse_id?: string | null
          description?: string | null
          id?: string
          inventory_account_id?: string | null
          is_active?: boolean
          lead_time_days?: number
          max_stock?: number | null
          name?: string
          parent_item_id?: string | null
          price?: number
          qr_code_value?: string | null
          reorder_level?: number
          revenue_account_id?: string | null
          safety_stock?: number
          sku?: string | null
          stock_quantity?: number
          tax_rate?: number
          track_inventory?: boolean
          type?: string
          unit?: string | null
          uom_id?: string | null
          updated_at?: string
          user_id?: string
          variant_attributes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_cogs_account_id_fkey"
            columns: ["cogs_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_inventory_account_id_fkey"
            columns: ["inventory_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_parent_item_id_fkey"
            columns: ["parent_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_revenue_account_id_fkey"
            columns: ["revenue_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          company_id: string
          created_at: string
          entry_date: string
          id: string
          is_posted: boolean
          memo: string | null
          reference: string | null
          reversed_by_entry_id: string | null
          reverses_entry_id: string | null
          source_id: string | null
          source_type: string | null
          updated_at: string
          user_id: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          memo?: string | null
          reference?: string | null
          reversed_by_entry_id?: string | null
          reverses_entry_id?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          user_id: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          memo?: string | null
          reference?: string | null
          reversed_by_entry_id?: string | null
          reverses_entry_id?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          user_id?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reversed_by_entry_id_fkey"
            columns: ["reversed_by_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_reverses_entry_id_fkey"
            columns: ["reverses_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          company_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string
          created_at: string
          days_requested: number
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          requested_by: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_requested: number
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_requested?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          annual_allocation_days: number
          color: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_paid: boolean
          name: string
          updated_at: string
        }
        Insert: {
          annual_allocation_days?: number
          color?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          annual_allocation_days?: number
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
          status: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          approval_notifications: boolean
          company_id: string
          created_at: string
          email_notifications: boolean
          invoice_notifications: boolean
          push_notifications: boolean
          reminder_notifications: boolean
          team_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_notifications?: boolean
          company_id: string
          created_at?: string
          email_notifications?: boolean
          invoice_notifications?: boolean
          push_notifications?: boolean
          reminder_notifications?: boolean
          team_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_notifications?: boolean
          company_id?: string
          created_at?: string
          email_notifications?: boolean
          invoice_notifications?: boolean
          push_notifications?: boolean
          reminder_notifications?: boolean
          team_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          company_created: boolean
          completed_at: string | null
          created_at: string
          current_step: string
          email_verified: boolean
          profile_completed: boolean
          selected_plan: string | null
          subscription_created: boolean
          updated_at: string
          user_id: string
          workspace_created: boolean
        }
        Insert: {
          company_created?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: string
          email_verified?: boolean
          profile_completed?: boolean
          selected_plan?: string | null
          subscription_created?: boolean
          updated_at?: string
          user_id: string
          workspace_created?: boolean
        }
        Update: {
          company_created?: boolean
          completed_at?: string | null
          created_at?: string
          current_step?: string
          email_verified?: boolean
          profile_completed?: boolean
          selected_plan?: string | null
          subscription_created?: boolean
          updated_at?: string
          user_id?: string
          workspace_created?: boolean
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
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      partner_api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          partner_id: string
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          partner_id: string
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          partner_id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_api_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_applications: {
        Row: {
          admin_notes: string | null
          approx_clients: string | null
          business_name: string
          business_type: string | null
          contact_email: string
          country: string
          created_at: string
          experience: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          marketing_channels: string[] | null
          monthly_audience: string | null
          motivation: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          terms_accepted: boolean
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          admin_notes?: string | null
          approx_clients?: string | null
          business_name: string
          business_type?: string | null
          contact_email: string
          country: string
          created_at?: string
          experience?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          marketing_channels?: string[] | null
          monthly_audience?: string | null
          motivation?: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          terms_accepted?: boolean
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          approx_clients?: string | null
          business_name?: string
          business_type?: string | null
          contact_email?: string
          country?: string
          created_at?: string
          experience?: string | null
          id?: string
          industry?: string | null
          linkedin_url?: string | null
          marketing_channels?: string[] | null
          monthly_audience?: string | null
          motivation?: string | null
          partner_type?: Database["public"]["Enums"]["partner_type"]
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["partner_application_status"]
          terms_accepted?: boolean
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      partner_commissions: {
        Row: {
          billed_amount: number
          commission_amount: number
          commission_rate: number
          company_id: string
          created_at: string
          currency: string
          flag_reason: string | null
          flagged_for_review: boolean
          id: string
          notes: string | null
          partner_id: string
          period_end: string | null
          period_start: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_order_id: string
          status: Database["public"]["Enums"]["partner_commission_status"]
          tier: number
          updated_at: string
        }
        Insert: {
          billed_amount: number
          commission_amount: number
          commission_rate: number
          company_id: string
          created_at?: string
          currency?: string
          flag_reason?: string | null
          flagged_for_review?: boolean
          id?: string
          notes?: string | null
          partner_id: string
          period_end?: string | null
          period_start?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_order_id: string
          status?: Database["public"]["Enums"]["partner_commission_status"]
          tier?: number
          updated_at?: string
        }
        Update: {
          billed_amount?: number
          commission_amount?: number
          commission_rate?: number
          company_id?: string
          created_at?: string
          currency?: string
          flag_reason?: string | null
          flagged_for_review?: boolean
          id?: string
          notes?: string | null
          partner_id?: string
          period_end?: string | null
          period_start?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_order_id?: string
          status?: Database["public"]["Enums"]["partner_commission_status"]
          tier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_commissions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payout_commissions: {
        Row: {
          commission_id: string
          payout_id: string
          released_at: string | null
        }
        Insert: {
          commission_id: string
          payout_id: string
          released_at?: string | null
        }
        Update: {
          commission_id?: string
          payout_id?: string
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_commissions_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "partner_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payout_commissions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "partner_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          reference: string | null
          status: Database["public"]["Enums"]["partner_payout_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          reference?: string | null
          status?: Database["public"]["Enums"]["partner_payout_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["partner_payout_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_program_settings: {
        Row: {
          id: boolean
          max_tiers: number
          multi_tier_enabled: boolean
          tier2_rate: number
          tier3_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          max_tiers?: number
          multi_tier_enabled?: boolean
          tier2_rate?: number
          tier3_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          max_tiers?: number
          multi_tier_enabled?: boolean
          tier2_rate?: number
          tier3_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      partner_referral_attributions: {
        Row: {
          attributed_at: string
          company_id: string
          first_touch_partner_id: string | null
          id: string
          last_touch_partner_id: string
          referred_user_id: string
          visitor_id: string | null
        }
        Insert: {
          attributed_at?: string
          company_id: string
          first_touch_partner_id?: string | null
          id?: string
          last_touch_partner_id: string
          referred_user_id: string
          visitor_id?: string | null
        }
        Update: {
          attributed_at?: string
          company_id?: string
          first_touch_partner_id?: string | null
          id?: string
          last_touch_partner_id?: string
          referred_user_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_referral_attributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referral_attributions_first_touch_partner_id_fkey"
            columns: ["first_touch_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_referral_attributions_last_touch_partner_id_fkey"
            columns: ["last_touch_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referral_clicks: {
        Row: {
          created_at: string
          id: string
          landing_path: string | null
          partner_id: string
          referrer: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          landing_path?: string | null
          partner_id: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          landing_path?: string | null
          partner_id?: string
          referrer?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referral_clicks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          application_id: string | null
          business_name: string
          commission_rate: number
          created_at: string
          created_by: string | null
          id: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          payout_email: string | null
          referral_code: string
          referred_by_partner_id: string | null
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          business_name: string
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          id?: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          payout_email?: string | null
          referral_code: string
          referred_by_partner_id?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          business_name?: string
          commission_rate?: number
          created_at?: string
          created_by?: string | null
          id?: string
          partner_type?: Database["public"]["Enums"]["partner_type"]
          payout_email?: string | null
          referral_code?: string
          referred_by_partner_id?: string | null
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "partner_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_referred_by_partner_id_fkey"
            columns: ["referred_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          paid_at: string | null
          pay_date: string
          period_end: string
          period_start: string
          status: string
          total_employee_deductions: number
          total_employer_contributions: number
          total_employer_cost: number
          total_gross: number
          total_net: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_at?: string | null
          pay_date: string
          period_end: string
          period_start: string
          status?: string
          total_employee_deductions?: number
          total_employer_contributions?: number
          total_employer_cost?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          paid_at?: string | null
          pay_date?: string
          period_end?: string
          period_start?: string
          status?: string
          total_employee_deductions?: number
          total_employer_contributions?: number
          total_employer_cost?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          base_currency_amount: number | null
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          deposit_account_id: string | null
          exchange_rate: number
          id: string
          invoice_id: string
          method: string
          notes: string | null
          payment_date: string
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          base_currency_amount?: number | null
          company_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          deposit_account_id?: string | null
          exchange_rate?: number
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          base_currency_amount?: number | null
          company_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          deposit_account_id?: string | null
          exchange_rate?: number
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          payment_date?: string
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_deposit_account_id_fkey"
            columns: ["deposit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_statutory_contributions: {
        Row: {
          affects_paye_base: boolean
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_rate: number
          employer_rate: number
          id: string
          is_active: boolean
          name: string
          source_note: string | null
        }
        Insert: {
          affects_paye_base?: boolean
          company_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_rate?: number
          employer_rate?: number
          id?: string
          is_active?: boolean
          name: string
          source_note?: string | null
        }
        Update: {
          affects_paye_base?: boolean
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_rate?: number
          employer_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          source_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_statutory_contributions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_tax_brackets: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_category: string
          id: string
          max_income: number | null
          min_income: number
          rate: number
          source_note: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_category?: string
          id?: string
          max_income?: number | null
          min_income?: number
          rate: number
          source_note?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_category?: string
          id?: string
          max_income?: number | null
          min_income?: number
          rate?: number
          source_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_tax_brackets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_contributions: {
        Row: {
          employee_amount: number
          employer_amount: number
          id: string
          name: string
          payslip_id: string
        }
        Insert: {
          employee_amount?: number
          employer_amount?: number
          id?: string
          name: string
          payslip_id: string
        }
        Update: {
          employee_amount?: number
          employer_amount?: number
          id?: string
          name?: string
          payslip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_contributions_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_line_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          label: string
          payslip_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          label: string
          payslip_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          label?: string
          payslip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_line_items_payslip_id_fkey"
            columns: ["payslip_id"]
            isOneToOne: false
            referencedRelation: "payslips"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          base_salary: number
          company_id: string
          created_at: string
          currency: string
          employee_id: string
          gross_salary: number
          id: string
          net_pay: number
          pay_run_id: string
          paye: number
          taxable_income: number
          total_employee_deductions: number
          total_employer_contributions: number
          total_employer_cost: number
        }
        Insert: {
          base_salary: number
          company_id: string
          created_at?: string
          currency?: string
          employee_id: string
          gross_salary: number
          id?: string
          net_pay?: number
          pay_run_id: string
          paye?: number
          taxable_income: number
          total_employee_deductions?: number
          total_employer_contributions?: number
          total_employer_cost?: number
        }
        Update: {
          base_salary?: number
          company_id?: string
          created_at?: string
          currency?: string
          employee_id?: string
          gross_salary?: number
          id?: string
          net_pay?: number
          pay_run_id?: string
          paye?: number
          taxable_income?: number
          total_employee_deductions?: number
          total_employer_contributions?: number
          total_employer_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "payslips_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
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
          is_staff: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_staff?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_staff?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string
          created_at: string
          description: string
          id: string
          item_id: string | null
          po_id: string
          quantity: number
          received_quantity: number
          tax_rate: number
          unit_price: number
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount?: number
          company_id: string
          created_at?: string
          description: string
          id?: string
          item_id?: string | null
          po_id: string
          quantity?: number
          received_quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          item_id?: string | null
          po_id?: string
          quantity?: number
          received_quantity?: number
          tax_rate?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string
          converted_bill_id: string | null
          created_at: string
          currency: string
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          company_id: string
          converted_bill_id?: string | null
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          company_id?: string
          converted_bill_id?: string | null
          created_at?: string
          currency?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_converted_bill_id_fkey"
            columns: ["converted_bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_date: string | null
          next_run_date: string
          template_invoice_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date: string
          template_invoice_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_date?: string | null
          next_run_date?: string
          template_invoice_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_template_invoice_id_fkey"
            columns: ["template_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      report_view_presets: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          id: string
          name: string
          report_key: string
          user_id: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          id?: string
          name: string
          report_key: string
          user_id: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          id?: string
          name?: string
          report_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_view_presets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_removable: boolean
          is_system: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_removable?: boolean
          is_system?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_removable?: boolean
          is_system?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          balance_after: number | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          item_id: string
          location_id: string | null
          note: string | null
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          balance_after?: number | null
          company_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          item_id: string
          location_id?: string | null
          note?: string | null
          quantity_change: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          balance_after?: number | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          item_id?: string
          location_id?: string | null
          note?: string | null
          quantity_change?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
          price_annual: number | null
          price_monthly: number | null
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
          price_annual?: number | null
          price_monthly?: number | null
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
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          billing_interval: string
          cancel_at_period_end: boolean
          company_id: string | null
          company_limit: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string | null
          owner_id: string | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan: string
          plan_id: string | null
          polar_customer_id: string | null
          polar_last_event_at: string | null
          polar_subscription_id: string | null
          price_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle?: string | null
          billing_interval?: string
          cancel_at_period_end?: boolean
          company_id?: string | null
          company_limit?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          owner_id?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          plan_id?: string | null
          polar_customer_id?: string | null
          polar_last_event_at?: string | null
          polar_subscription_id?: string | null
          price_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string | null
          billing_interval?: string
          cancel_at_period_end?: boolean
          company_id?: string | null
          company_limit?: number | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          owner_id?: string | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan?: string
          plan_id?: string | null
          polar_customer_id?: string | null
          polar_last_event_at?: string | null
          polar_subscription_id?: string | null
          price_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_deadlines: {
        Row: {
          company_id: string
          created_at: string
          due_date: string
          id: string
          is_recurring: boolean
          reminder_days_before: number
          status: string
          tax_return_id: string | null
          tax_setting_id: string | null
          tax_type: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          is_recurring?: boolean
          reminder_days_before?: number
          status?: string
          tax_return_id?: string | null
          tax_setting_id?: string | null
          tax_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          is_recurring?: boolean
          reminder_days_before?: number
          status?: string
          tax_return_id?: string | null
          tax_setting_id?: string | null
          tax_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_deadlines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_deadlines_tax_return_id_fkey"
            columns: ["tax_return_id"]
            isOneToOne: false
            referencedRelation: "tax_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_deadlines_tax_setting_id_fkey"
            columns: ["tax_setting_id"]
            isOneToOne: false
            referencedRelation: "company_tax_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_documents: {
        Row: {
          company_id: string
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          return_id: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          doc_type: string
          file_name: string
          file_path: string
          id?: string
          return_id: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          return_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tax_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_documents_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "tax_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          currency: string
          id: string
          method: string
          notes: string | null
          paid_date: string
          reference: string | null
          return_id: string
          source_account_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_date?: string
          reference?: string | null
          return_id: string
          source_account_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_date?: string
          reference?: string | null
          return_id?: string
          source_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_payments_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "tax_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_payments_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_periods: {
        Row: {
          company_id: string
          created_at: string
          due_date: string
          id: string
          period_end: string
          period_start: string
          status: string
          tax_setting_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          period_end: string
          period_start: string
          status?: string
          tax_setting_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          period_end?: string
          period_start?: string
          status?: string
          tax_setting_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_periods_tax_setting_id_fkey"
            columns: ["tax_setting_id"]
            isOneToOne: false
            referencedRelation: "company_tax_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_return_lines: {
        Row: {
          account_id: string | null
          company_id: string
          created_at: string
          description: string | null
          direction: string
          id: string
          return_id: string
          source_id: string | null
          source_type: string
          tax_amount: number
          taxable_amount: number
        }
        Insert: {
          account_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          direction: string
          id?: string
          return_id: string
          source_id?: string | null
          source_type: string
          tax_amount?: number
          taxable_amount?: number
        }
        Update: {
          account_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          return_id?: string
          source_id?: string | null
          source_type?: string
          tax_amount?: number
          taxable_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_return_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_return_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_return_lines_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "tax_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_returns: {
        Row: {
          company_id: string
          created_at: string
          id: string
          input_tax: number
          net_tax_due: number
          notes: string | null
          output_tax: number
          reference_number: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tax_period_id: string
          tax_type: string
          taxable_purchases: number
          taxable_sales: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          input_tax?: number
          net_tax_due?: number
          notes?: string | null
          output_tax?: number
          reference_number?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period_id: string
          tax_type?: string
          taxable_purchases?: number
          taxable_sales?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          input_tax?: number
          net_tax_due?: number
          notes?: string | null
          output_tax?: number
          reference_number?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period_id?: string
          tax_type?: string
          taxable_purchases?: number
          taxable_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_returns_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          personal_message: string | null
          role_id: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          personal_message?: string | null
          role_id: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          personal_message?: string | null
          role_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          message: string
          name: string
          rating: number
          role_company: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          message: string
          name: string
          rating: number
          role_company?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          message?: string
          name?: string
          rating?: number
          role_company?: string | null
        }
        Relationships: []
      }
      units_of_measure: {
        Row: {
          base_unit_id: string | null
          category: string
          code: string
          company_id: string | null
          conversion_factor: number
          created_at: string
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_unit_id?: string | null
          category?: string
          code: string
          company_id?: string | null
          conversion_factor?: number
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_unit_id?: string | null
          category?: string
          code?: string
          company_id?: string | null
          conversion_factor?: number
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_of_measure_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units_of_measure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_of_measure_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_company_preferences: {
        Row: {
          company_id: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_company_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_label: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          os: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_label?: string | null
          id?: string
          ip_address?: string | null
          last_seen_at?: string
          os?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          is_1099: boolean
          name: string
          notes: string | null
          payment_terms: number
          phone: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_1099?: boolean
          name: string
          notes?: string | null
          payment_terms?: number
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_1099?: boolean
          name?: string
          notes?: string | null
          payment_terms?: number
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_locations: {
        Row: {
          barcode: string | null
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          location_type: string
          name: string | null
          parent_location_id: string | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          barcode?: string | null
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string | null
          parent_location_id?: string | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          barcode?: string | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string | null
          parent_location_id?: string | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "warehouse_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_locations_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          code: string
          company_id: string
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          company_id: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          company_id?: string
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { _token: string }
        Returns: string
      }
      accept_team_invitation: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          role_id: string
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "company_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      adjust_stock: {
        Args: {
          p_company_id: string
          p_item_id: string
          p_location_id?: string
          p_note?: string
          p_offset_account_id?: string
          p_quantity_delta: number
          p_reason: string
          p_warehouse_id: string
        }
        Returns: {
          balance_after: number | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          item_id: string
          location_id: string | null
          note: string | null
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string
          warehouse_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_process_bank_transaction: {
        Args: { _txn_id: string }
        Returns: undefined
      }
      ai_process_pending_transactions: {
        Args: { _company_id: string }
        Returns: number
      }
      ai_resolve_review_task: {
        Args: { _approve: boolean; _task_id: string }
        Returns: undefined
      }
      apply_invoice_stock: {
        Args: { _direction: number; _invoice_id: string; _reason?: string }
        Returns: undefined
      }
      apply_polar_subscription_event: {
        Args: {
          p_billing_cycle: string
          p_cancel_at_period_end: boolean
          p_company_id: string
          p_current_period_end: string
          p_current_period_start: string
          p_event_modified_at: string
          p_plan: string
          p_polar_customer_id: string
          p_polar_subscription_id: string
          p_price_id: string
          p_status: string
          p_user_id: string
        }
        Returns: boolean
      }
      approve_partner_application: {
        Args: { p_application_id: string; p_commission_rate?: number }
        Returns: {
          application_id: string | null
          business_name: string
          commission_rate: number
          created_at: string
          created_by: string | null
          id: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          payout_email: string | null
          referral_code: string
          referred_by_partner_id: string | null
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "partners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_journal_entry_balanced: {
        Args: { p_entry_id: string }
        Returns: undefined
      }
      change_member_role: {
        Args: { p_member_id: string; p_new_role_id: string }
        Returns: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          role_id: string
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "company_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_engagement_reminders: { Args: never; Returns: number }
      company_has_active_ai_bookkeeper_plan: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      company_has_feature: {
        Args: { p_company_id: string; p_feature: string }
        Returns: boolean
      }
      company_wants_reminders: {
        Args: { _company_id: string; _user_id: string }
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
        Returns: {
          amount: number
          company_id: string
          created_at: string
          from_account_id: string
          id: string
          notes: string | null
          to_account_id: string
          transfer_date: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bank_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
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
        Returns: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          inbound_email_token: string
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
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_partner_payout: {
        Args: {
          p_commission_ids: string[]
          p_method?: string
          p_notes?: string
          p_partner_id: string
          p_reference?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          reference: string | null
          status: Database["public"]["Enums"]["partner_payout_status"]
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_pay_run_atomic: {
        Args: {
          p_company_id: string
          p_currency: string
          p_notes: string
          p_pay_date: string
          p_payslips: Json
          p_period_end: string
          p_period_start: string
          p_user_id: string
        }
        Returns: string
      }
      create_team_invitation: {
        Args: {
          p_company_id: string
          p_email: string
          p_personal_message?: string
          p_role_id: string
        }
        Returns: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          personal_message: string | null
          role_id: string
          status: string
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "team_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dispatch_stock: {
        Args: {
          p_company_id: string
          p_invoice_id?: string
          p_item_id: string
          p_location_id?: string
          p_note?: string
          p_quantity: number
          p_reason?: string
          p_reference_id?: string
          p_reference_type?: string
          p_unit_cost?: number
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: {
          balance_after: number | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          item_id: string
          location_id: string | null
          note: string | null
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string
          warehouse_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_account: {
        Args: { _code: string; _user_id: string }
        Returns: string
      }
      find_account_by_company: {
        Args: { _code: string; _company_id: string }
        Returns: string
      }
      generate_inbound_token: { Args: never; Returns: string }
      generate_partner_referral_code: {
        Args: { p_business_name: string }
        Returns: string
      }
      get_active_plan: { Args: { _company_id: string }; Returns: string }
      get_company_role: {
        Args: { p_company_id: string }
        Returns: Database["public"]["Enums"]["company_member_role"]
      }
      get_company_seat_limit: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_company_seat_usage: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_default_company_id: { Args: never; Returns: string }
      get_public_invoice: { Args: { p_token: string }; Returns: Json }
      get_public_team_invitation: { Args: { p_token: string }; Returns: Json }
      get_weekly_invoice_usage: {
        Args: { p_company_id: string }
        Returns: Json
      }
      invoice_receivable_balances: {
        Args: { _as_of?: string; _company_id: string }
        Returns: {
          amount_credited: number
          amount_paid: number
          balance: number
          currency: string
          customer_id: string
          customer_name: string
          days_overdue: number
          due_date: string
          invoice_id: string
          invoice_number: string
          issue_date: string
          status: string
          total: number
        }[]
      }
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_mate: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_platform_staff: { Args: never; Returns: boolean }
      log_document_audit_event: {
        Args: {
          p_action: string
          p_company_id: string
          p_document_id: string
          p_metadata?: Json
        }
        Returns: string
      }
      mark_partner_payout_failed: {
        Args: { p_notes?: string; p_payout_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          reference: string | null
          status: Database["public"]["Enums"]["partner_payout_status"]
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_partner_payout_paid: {
        Args: { p_payout_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method: string | null
          notes: string | null
          paid_at: string | null
          partner_id: string
          reference: string | null
          status: Database["public"]["Enums"]["partner_payout_status"]
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      match_or_create_vendor: {
        Args: { _company_id: string; _name: string; _user_id: string }
        Returns: string
      }
      maybe_notify_reminder: {
        Args: {
          _body: string
          _company_id: string
          _link: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      partner_qualified_referral_count: {
        Args: { _company_id: string; _partner_id: string }
        Returns: number
      }
      post_bill_journal: { Args: { _bill_id: string }; Returns: undefined }
      post_bill_payment_journal: {
        Args: { _pay_id: string }
        Returns: undefined
      }
      post_credit_note_journal: { Args: { _cn_id: string }; Returns: undefined }
      post_expense_journal: {
        Args: { _expense_id: string }
        Returns: undefined
      }
      post_inventory_journal_entry: {
        Args: {
          p_amount: number
          p_company_id: string
          p_credit_account_id: string
          p_debit_account_id: string
          p_memo: string
          p_source_id: string
          p_source_type: string
          p_user_id: string
        }
        Returns: string
      }
      post_invoice_journal: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      post_payment_journal: {
        Args: { _payment_id: string }
        Returns: undefined
      }
      post_payrun_to_ledger: {
        Args: {
          p_bank_account_id: string
          p_employer_tax_expense_account_id: string
          p_pay_run_id: string
          p_salary_expense_account_id: string
          p_statutory_payable_account_id: string
        }
        Returns: string
      }
      recalc_bill_status: { Args: { _bill_id: string }; Returns: undefined }
      recalc_invoice_status: {
        Args: { _invoice_id: string }
        Returns: undefined
      }
      receive_stock: {
        Args: {
          p_company_id: string
          p_item_id: string
          p_location_id?: string
          p_note?: string
          p_offset_account_id?: string
          p_po_item_id?: string
          p_quantity: number
          p_unit_cost: number
          p_warehouse_id: string
        }
        Returns: {
          balance_after: number | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          item_id: string
          location_id: string | null
          note: string | null
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string
          warehouse_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_session: {
        Args: {
          p_browser?: string
          p_device_label?: string
          p_ip_address?: string
          p_os?: string
          p_user_agent?: string
        }
        Returns: {
          browser: string | null
          created_at: string
          device_label: string | null
          id: string
          ip_address: string | null
          last_seen_at: string
          os: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_stock_movement: {
        Args: {
          p_company_id: string
          p_invoice_id?: string
          p_item_id: string
          p_location_id?: string
          p_note?: string
          p_quantity_change: number
          p_reason: string
          p_reference_id?: string
          p_reference_type?: string
          p_unit_cost?: number
          p_user_id: string
          p_warehouse_id: string
        }
        Returns: {
          balance_after: number | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          item_id: string
          location_id: string | null
          note: string | null
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          user_id: string
          warehouse_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resend_team_invitation: {
        Args: { p_invitation_id: string }
        Returns: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          personal_message: string | null
          role_id: string
          status: string
          token: string
        }
        SetofOptions: {
          from: "*"
          to: "team_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revalue_open_transaction: {
        Args: { _id: string; _new_rate: number; _type: string }
        Returns: undefined
      }
      review_partner_commission: {
        Args: {
          p_commission_id: string
          p_notes?: string
          p_status: Database["public"]["Enums"]["partner_commission_status"]
        }
        Returns: {
          billed_amount: number
          commission_amount: number
          commission_rate: number
          company_id: string
          created_at: string
          currency: string
          flag_reason: string | null
          flagged_for_review: boolean
          id: string
          notes: string | null
          partner_id: string
          period_end: string | null
          period_start: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_order_id: string
          status: Database["public"]["Enums"]["partner_commission_status"]
          tier: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_commissions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_session: { Args: { p_session_id: string }; Returns: undefined }
      seed_default_accounts: {
        Args: { _company_id?: string; _user_id: string }
        Returns: undefined
      }
      set_default_company: { Args: { p_company_id: string }; Returns: string }
      set_member_status: {
        Args: { p_member_id: string; p_status: string }
        Returns: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["company_member_role"]
          role_id: string
          status: Database["public"]["Enums"]["company_member_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "company_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_partner_application_status: {
        Args: {
          p_admin_notes?: string
          p_application_id: string
          p_status: Database["public"]["Enums"]["partner_application_status"]
        }
        Returns: {
          admin_notes: string | null
          approx_clients: string | null
          business_name: string
          business_type: string | null
          contact_email: string
          country: string
          created_at: string
          experience: string | null
          id: string
          industry: string | null
          linkedin_url: string | null
          marketing_channels: string[] | null
          monthly_audience: string | null
          motivation: string | null
          partner_type: Database["public"]["Enums"]["partner_type"]
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["partner_application_status"]
          terms_accepted: boolean
          updated_at: string
          user_id: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_partner_status: {
        Args: {
          p_partner_id: string
          p_status: Database["public"]["Enums"]["partner_status"]
        }
        Returns: {
          application_id: string | null
          business_name: string
          commission_rate: number
          created_at: string
          created_by: string | null
          id: string
          partner_type: Database["public"]["Enums"]["partner_type"]
          payout_email: string | null
          referral_code: string
          referred_by_partner_id: string | null
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "partners"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_partner_application: {
        Args: {
          p_approx_clients?: string
          p_business_name: string
          p_business_type?: string
          p_contact_email: string
          p_country: string
          p_experience?: string
          p_industry?: string
          p_linkedin_url?: string
          p_marketing_channels?: string[]
          p_monthly_audience?: string
          p_motivation?: string
          p_partner_type: Database["public"]["Enums"]["partner_type"]
          p_phone?: string
          p_terms_accepted: boolean
          p_website?: string
        }
        Returns: string
      }
      touch_session: { Args: { p_session_id: string }; Returns: undefined }
      transfer_stock: {
        Args: {
          p_company_id: string
          p_from_location_id?: string
          p_from_warehouse_id: string
          p_item_id: string
          p_note?: string
          p_quantity: number
          p_to_location_id?: string
          p_to_warehouse_id: string
        }
        Returns: {
          movement_in: Database["public"]["Tables"]["stock_movements"]["Row"]
          movement_out: Database["public"]["Tables"]["stock_movements"]["Row"]
        }[]
      }
      update_own_plan: {
        Args: { new_interval?: string; new_plan: string }
        Returns: {
          billing_cycle: string | null
          billing_interval: string
          cancel_at_period_end: boolean
          company_id: string | null
          company_limit: number | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string | null
          owner_id: string | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan: string
          plan_id: string | null
          polar_customer_id: string | null
          polar_last_event_at: string | null
          polar_subscription_id: string | null
          price_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_partner_program_settings: {
        Args: {
          p_max_tiers: number
          p_multi_tier_enabled: boolean
          p_tier2_rate: number
          p_tier3_rate: number
        }
        Returns: {
          id: boolean
          max_tiers: number
          multi_tier_enabled: boolean
          tier2_rate: number
          tier3_rate: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "partner_program_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_manual_journal_entry: {
        Args: { p_entry_id: string }
        Returns: string
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      company_member_role:
        | "owner"
        | "admin"
        | "accountant"
        | "sales"
        | "inventory"
        | "hr"
        | "payroll"
        | "viewer"
      company_member_status: "active" | "invited" | "suspended" | "removed"
      org_member_role: "owner" | "admin" | "member"
      org_member_status: "active" | "invited" | "suspended"
      partner_application_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_more_info"
      partner_commission_status:
        | "pending"
        | "approved"
        | "rejected"
        | "paid"
        | "cancelled"
        | "reversed"
      partner_payout_status: "pending" | "paid" | "failed"
      partner_status: "active" | "suspended" | "banned"
      partner_type:
        | "affiliate"
        | "bookkeeping_firm"
        | "accounting_firm"
        | "accountant"
        | "tax_consultant"
        | "educator"
        | "influencer"
        | "reseller"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      company_member_status: ["active", "invited", "suspended", "removed"],
      org_member_role: ["owner", "admin", "member"],
      org_member_status: ["active", "invited", "suspended"],
      partner_application_status: [
        "pending",
        "approved",
        "rejected",
        "needs_more_info",
      ],
      partner_commission_status: [
        "pending",
        "approved",
        "rejected",
        "paid",
        "cancelled",
        "reversed",
      ],
      partner_payout_status: ["pending", "paid", "failed"],
      partner_status: ["active", "suspended", "banned"],
      partner_type: [
        "affiliate",
        "bookkeeping_firm",
        "accounting_firm",
        "accountant",
        "tax_consultant",
        "educator",
        "influencer",
        "reseller",
      ],
    },
  },
} as const
