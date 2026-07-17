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
          amount: number
          bank_account_id: string
          bank_transfer_id: string | null
          category_account_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_transfer: boolean
          reconciled: boolean
          reconciled_at: string | null
          reference: string | null
          txn_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          bank_transfer_id?: string | null
          category_account_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_transfer?: boolean
          reconciled?: boolean
          reconciled_at?: string | null
          reference?: string | null
          txn_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          bank_transfer_id?: string | null
          category_account_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_transfer?: boolean
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
          bill_id: string
          company_id: string
          created_at: string
          currency: string
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
          bill_id: string
          company_id: string
          created_at?: string
          currency?: string
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
          bill_id?: string
          company_id?: string
          created_at?: string
          currency?: string
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
      bills: {
        Row: {
          bill_number: string
          company_id: string
          created_at: string
          currency: string
          due_date: string | null
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
          bill_number: string
          company_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
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
          bill_number?: string
          company_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
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
          company_id: string
          created_at: string
          credit_note_number: string
          currency: string
          customer_id: string | null
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
          company_id: string
          created_at?: string
          credit_note_number: string
          currency?: string
          customer_id?: string | null
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
          company_id?: string
          created_at?: string
          credit_note_number?: string
          currency?: string
          customer_id?: string | null
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
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
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
          amount: number
          category: string | null
          company_id: string
          created_at: string
          currency: string
          description: string | null
          expense_date: string
          id: string
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          expense_date?: string
          id?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      invoices: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
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
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
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
          created_at?: string
          currency?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
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
          category_id: string | null
          company_id: string
          cost: number
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          tax_rate: number
          track_inventory: boolean
          type: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          cost?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          tax_rate?: number
          track_inventory?: boolean
          type?: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          cost?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          tax_rate?: number
          track_inventory?: boolean
          type?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "item_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          source_id: string | null
          source_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          memo?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          is_posted?: boolean
          memo?: string | null
          reference?: string | null
          source_id?: string | null
          source_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          currency: string
          customer_id: string | null
          deposit_account_id: string | null
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
          company_id: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          deposit_account_id?: string | null
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
          company_id?: string
          created_at?: string
          currency?: string
          customer_id?: string | null
          deposit_account_id?: string | null
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
          note: string | null
          quantity_change: number
          reason: string
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          company_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          item_id: string
          note?: string | null
          quantity_change: number
          reason: string
          user_id: string
        }
        Update: {
          balance_after?: number | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          item_id?: string
          note?: string | null
          quantity_change?: number
          reason?: string
          user_id?: string
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
        Relationships: [
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
      team_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
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
          invited_by: string
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
          invited_by?: string
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
      }
      apply_invoice_stock:
        | {
            Args: { _direction: number; _invoice_id: string }
            Returns: undefined
          }
        | {
            Args: { _direction: number; _invoice_id: string; _reason?: string }
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
          invited_by: string
          personal_message: string | null
          role_id: string
          status: string
          token: string
        }
      }
      find_account: {
        Args: { _code: string; _user_id: string }
        Returns: string
      }
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
      is_company_admin: { Args: { p_company_id: string }; Returns: boolean }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_mate: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      post_bill_journal: { Args: { _bill_id: string }; Returns: undefined }
      post_bill_payment_journal: {
        Args: { _pay_id: string }
        Returns: undefined
      }
      post_credit_note_journal: { Args: { _cn_id: string }; Returns: undefined }
      post_payment_journal: {
        Args: { _payment_id: string }
        Returns: undefined
      }
      recalc_bill_status: { Args: { _bill_id: string }; Returns: undefined }
      recalc_invoice_status: {
        Args: { _invoice_id: string }
        Returns: undefined
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
          invited_by: string
          personal_message: string | null
          role_id: string
          status: string
          token: string
        }
      }
      revoke_session: { Args: { p_session_id: string }; Returns: undefined }
      seed_default_accounts: { Args: { _user_id: string }; Returns: undefined }
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
      }
      touch_session: { Args: { p_session_id: string }; Returns: undefined }
      update_own_plan:
        | {
            Args: { new_plan: string }
            Returns: {
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
          }
        | {
            Args: { new_interval?: string; new_plan: string }
            Returns: {
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
    },
  },
} as const
