export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          tenant_id: string
          name: string
          email: string
          phone: string | null
          grade_interested: string
          referral_source: string | null
          status: 'new' | 'contacted' | 'enrolled' | 'archived'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          tenant_id: string
          name: string
          email: string
          phone?: string | null
          grade_interested: string
          referral_source?: string | null
          status?: 'new' | 'contacted' | 'enrolled' | 'archived'
          admin_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      students: {
        Row: {
          id: string
          tenant_id: string
          name: string
          grade: string
          status: 'active' | 'inactive'
          parent_email: string | null
          enrollment_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          tenant_id: string
          name: string
          grade: string
          status?: 'active' | 'inactive'
          parent_email?: string | null
          enrollment_date?: string
        }
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }
      feedback: {
        Row: {
          id: string
          tenant_id: string
          child_name: string
          satisfaction: number
          suggestion: string | null
          contact_wanted: boolean
          parent_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          tenant_id: string
          child_name: string
          satisfaction: number
          suggestion?: string | null
          contact_wanted?: boolean
          parent_email?: string | null
        }
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>
      }
      followups: {
        Row: {
          id: string
          tenant_id: string
          contact_id: string
          contact_type: 'lead' | 'student' | 'parent'
          type: 'call' | 'email' | 'sms' | 'in-person'
          due_date: string
          status: 'pending' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          tenant_id: string
          contact_id: string
          contact_type: 'lead' | 'student' | 'parent'
          type: 'call' | 'email' | 'sms' | 'in-person'
          due_date: string
          status?: 'pending' | 'completed' | 'cancelled'
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['followups']['Insert']>
      }
    }
  }
}

export interface OpslyEvent {
  event_type: string
  tenant_id: string
  created_at: string
  data: Record<string, unknown>
  trace_id?: string
}

export interface DashboardData {
  new_leads_count: number
  new_leads: Pick<Database['public']['Tables']['leads']['Row'], 'id' | 'name' | 'email' | 'phone' | 'grade_interested'>[]
  active_students_count: number
  students_by_grade: Record<string, number>
  recent_feedback: Pick<Database['public']['Tables']['feedback']['Row'], 'id' | 'child_name' | 'satisfaction' | 'suggestion'>[]
  pending_followups_count: number
  pending_followups: Pick<Database['public']['Tables']['followups']['Row'], 'id' | 'contact_id' | 'due_date' | 'type'>[]
}
