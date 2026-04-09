export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          user_id: string
          address: string
          city: string | null
          state: string | null
          zip: string | null
          price: number | null
          beds: number | null
          baths: number | null
          sqft: number | null
          year_built: number | null
          listing_url: string | null
          status: 'watching' | 'visited' | 'offer_made' | 'under_contract' | 'purchased' | 'passed'
          is_primary: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
      }
      property_pros_cons: {
        Row: {
          id: string
          property_id: string
          type: 'pro' | 'con'
          text: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['property_pros_cons']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['property_pros_cons']['Insert']>
      }
      property_visits: {
        Row: {
          id: string
          property_id: string
          visited_at: string
          notes: string | null
          overall_rating: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['property_visits']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['property_visits']['Insert']>
      }
      pre_approvals: {
        Row: {
          id: string
          user_id: string
          lender_name: string
          amount: number
          interest_rate: number | null
          loan_type: string | null
          expires_at: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['pre_approvals']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['pre_approvals']['Insert']>
      }
      inspections: {
        Row: {
          id: string
          property_id: string
          inspector_name: string | null
          inspector_company: string | null
          inspector_phone: string | null
          inspector_email: string | null
          scheduled_at: string | null
          completed_at: string | null
          cost: number | null
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          report_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inspections']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inspections']['Insert']>
      }
      inspection_items: {
        Row: {
          id: string
          inspection_id: string
          description: string
          category: string | null
          priority: 'high' | 'medium' | 'low'
          status: 'open' | 'in_progress' | 'resolved' | 'wont_fix'
          estimated_cost: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['inspection_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inspection_items']['Insert']>
      }
      insurance_quotes: {
        Row: {
          id: string
          property_id: string
          company_name: string
          agent_name: string | null
          agent_phone: string | null
          agent_email: string | null
          annual_premium: number | null
          monthly_premium: number | null
          coverage_amount: number | null
          deductible: number | null
          policy_type: string | null
          notes: string | null
          is_selected: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['insurance_quotes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['insurance_quotes']['Insert']>
      }
      closing_items: {
        Row: {
          id: string
          property_id: string
          title: string
          category: 'document' | 'payment' | 'appointment' | 'task' | null
          status: 'pending' | 'in_progress' | 'completed'
          due_date: string | null
          amount: number | null
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['closing_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['closing_items']['Insert']>
      }
      budget_items: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          category: string
          name: string
          estimated_monthly: number
          actual_monthly: number | null
          frequency: 'monthly' | 'annual' | 'one_time'
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['budget_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['budget_items']['Insert']>
      }
      documents: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          title: string
          category: 'contract' | 'disclosure' | 'inspection' | 'title' | 'appraisal' | 'hoa' | 'insurance' | 'mortgage' | 'warranty' | 'other' | null
          storage_path: string
          file_size: number | null
          mime_type: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
      rooms: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          name: string
          description: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['rooms']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
      }
      room_projects: {
        Row: {
          id: string
          room_id: string
          title: string
          description: string | null
          status: 'on_hold' | 'planned' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'high' | 'medium' | 'low'
          is_diy: boolean
          budget_estimate: number | null
          actual_cost: number | null
          contractor_name: string | null
          contractor_phone: string | null
          contractor_quote: number | null
          start_date: string | null
          end_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['room_projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['room_projects']['Insert']>
      }
      room_photos: {
        Row: {
          id: string
          room_id: string
          project_id: string | null
          storage_path: string
          photo_type: 'current' | 'inspiration' | 'completed'
          caption: string | null
          source_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['room_photos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['room_photos']['Insert']>
      }
      project_resources: {
        Row: {
          id: string
          project_id: string
          title: string
          url: string | null
          resource_type: 'article' | 'video' | 'product' | 'supplier' | 'other' | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['project_resources']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['project_resources']['Insert']>
      }
      contractors: {
        Row: {
          id: string
          user_id: string
          name: string
          company: string | null
          trade: string | null
          phone: string | null
          email: string | null
          rating: number | null
          is_recommended: boolean
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['contractors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['contractors']['Insert']>
      }
      offers: {
        Row: {
          id: string
          property_id: string
          amount: number
          offered_at: string
          status: 'pending' | 'countered' | 'accepted' | 'rejected' | 'withdrawn'
          counter_amount: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['offers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
      }
      sourcing_items: {
        Row: {
          id: string
          user_id: string
          room_id: string
          project_id: string | null
          category: string
          item_description: string
          total_cost: number | null
          link: string | null
          status: 'tentative' | 'approved' | 'backup' | 'later' | 'ordered' | 'arrived'
          material_finish: string | null
          dimensions: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['sourcing_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['sourcing_items']['Insert']>
      }
      census_cache: {
        Row: {
          zip: string
          data: Json
          fetched_at: string
        }
        Insert: {
          zip: string
          data: Json
          fetched_at?: string
        }
        Update: {
          zip?: string
          data?: Json
          fetched_at?: string
        }
      }
      property_shares: {
        Row: {
          id: string
          property_id: string
          owner_id: string
          invited_email: string
          accepted_user_id: string | null
          permission: 'view' | 'edit'
          token: string
          status: 'pending' | 'accepted' | 'revoked'
          created_at: string
          accepted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['property_shares']['Row'], 'id' | 'created_at' | 'token'>
        Update: Partial<Database['public']['Tables']['property_shares']['Row']>
      }
      maintenance_tasks: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          title: string
          description: string | null
          category: 'HVAC' | 'Plumbing' | 'Electrical' | 'Exterior' | 'Interior' | 'Appliances' | 'Landscaping' | 'Safety' | 'Seasonal' | 'General'
          recurrence: 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'one_time'
          due_month: number | null
          due_date: string | null
          last_done_at: string | null
          next_due_at: string | null
          status: 'upcoming' | 'due' | 'overdue' | 'done'
          estimated_cost: number | null
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['maintenance_tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['maintenance_tasks']['Insert']>
      }
      moving_checklist_items: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          title: string
          category: 'before' | 'day_of' | 'after' | 'admin'
          is_completed: boolean
          completed_at: string | null
          due_date: string | null
          notes: string | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['moving_checklist_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['moving_checklist_items']['Insert']>
      }
      permits: {
        Row: {
          id: string
          user_id: string
          property_id: string | null
          permit_number: string | null
          title: string
          description: string | null
          permit_type: 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'roofing' | 'demolition' | 'zoning' | 'other'
          status: 'not_applied' | 'applied' | 'under_review' | 'approved' | 'active' | 'passed_inspection' | 'closed' | 'rejected'
          applied_at: string | null
          approved_at: string | null
          expires_at: string | null
          inspection_date: string | null
          contractor_id: string | null
          estimated_cost: number | null
          permit_fee: number | null
          issuing_authority: string | null
          notes: string | null
          document_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['permits']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['permits']['Insert']>
      }
    }
  }
}
