export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          class_modality: 'llanogrande' | 'domicilio' | null
          neighborhood: string | null
          grade_interested: string
          referral_source: string | null
          referral_code: string | null
          referred_by_code: string | null
          referral_discount_cents: number
          referral_redemptions: number
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
          class_modality?: 'llanogrande' | 'domicilio' | null
          neighborhood?: string | null
          grade_interested: string
          referral_source?: string | null
          referral_code?: string | null
          referred_by_code?: string | null
          referral_discount_cents?: number
          referral_redemptions?: number
          status?: 'new' | 'contacted' | 'enrolled' | 'archived'
          admin_notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
        Relationships: []
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
        Relationships: []
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
          author_type: 'parent' | 'teacher' | 'staff'
          author_ref_id: string | null
          subject_type: 'general' | 'class' | 'student' | 'operations'
          subject_ref_id: string | null
          visibility: 'public' | 'private'
          audience: 'family' | 'teacher' | 'admin'
          body: string | null
          rating: number | null
          status: 'new' | 'reviewed' | 'action_required' | 'closed'
          ai_summary: string | null
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
          author_type?: 'parent' | 'teacher' | 'staff'
          author_ref_id?: string | null
          subject_type?: 'general' | 'class' | 'student' | 'operations'
          subject_ref_id?: string | null
          visibility?: 'public' | 'private'
          audience?: 'family' | 'teacher' | 'admin'
          body?: string | null
          rating?: number | null
          status?: 'new' | 'reviewed' | 'action_required' | 'closed'
          ai_summary?: string | null
        }
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>
        Relationships: []
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
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          tenant_id: string
          source: 'whatsapp' | 'instagram' | 'web'
          sender_name: string | null
          sender_contact: string
          message_text: string
          external_id: string | null
          direction: 'inbound' | 'draft' | 'outbound'
          parent_message_id: string | null
          status: 'pending' | 'approved' | 'sent' | null
          ai_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          tenant_id: string
          source: 'whatsapp' | 'instagram' | 'web'
          sender_name?: string | null
          sender_contact: string
          message_text: string
          external_id?: string | null
          direction?: 'inbound' | 'draft' | 'outbound'
          parent_message_id?: string | null
          status?: 'pending' | 'approved' | 'sent' | null
          ai_generated?: boolean
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
        Relationships: []
      }
      webhook_logs: {
        Row: {
          id: string
          tenant_id: string
          provider: string
          event_type: string
          record_id: string
          payload: Json
          received_at: string
        }
        Insert: {
          tenant_id: string
          provider: string
          event_type: string
          record_id: string
          payload: Json
          received_at?: string
        }
        Update: Partial<Database['public']['Tables']['webhook_logs']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
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
  new_leads: Pick<
    Database['public']['Tables']['leads']['Row'],
    | 'id'
    | 'name'
    | 'email'
    | 'phone'
    | 'class_modality'
    | 'neighborhood'
    | 'grade_interested'
    | 'status'
    | 'admin_notes'
    | 'referral_code'
    | 'referred_by_code'
    | 'referral_discount_cents'
    | 'referral_redemptions'
  >[]
  active_students_count: number
  students_by_grade: Record<string, number>
  recent_feedback: Pick<
    Database['public']['Tables']['feedback']['Row'],
    | 'id'
    | 'child_name'
    | 'satisfaction'
    | 'suggestion'
    | 'author_type'
    | 'subject_type'
    | 'visibility'
    | 'audience'
    | 'parent_email'
    | 'body'
    | 'rating'
    | 'status'
  >[]
  private_family_notes: Pick<
    Database['public']['Tables']['feedback']['Row'],
    | 'id'
    | 'child_name'
    | 'satisfaction'
    | 'suggestion'
    | 'author_type'
    | 'subject_type'
    | 'visibility'
    | 'audience'
    | 'parent_email'
    | 'body'
    | 'rating'
    | 'status'
    | 'created_at'
  >[]
  pending_followups_count: number
  pending_followups: Pick<
    Database['public']['Tables']['followups']['Row'],
    'id' | 'contact_id' | 'contact_type' | 'due_date' | 'type' | 'status' | 'notes'
  >[]
  followups: Pick<
    Database['public']['Tables']['followups']['Row'],
    'id' | 'contact_id' | 'contact_type' | 'due_date' | 'type' | 'status' | 'notes'
  >[]
  recent_messages: Array<
    Pick<
      Database['public']['Tables']['messages']['Row'],
      'id' | 'source' | 'sender_name' | 'sender_contact' | 'message_text' | 'created_at' | 'status' | 'direction'
    > & {
      conversation_mode: 'admissions' | 'support'
    }
  >
  bi_snapshot?: PeskidsBiSnapshot | null
}

export interface PeskidsBiFamilyMetrics {
  totalSubmissions: number
  reviewedSubmissions: number
  pendingSubmissions: number
  averageSatisfaction: number
  privateNotesCount: number
  activeChatThreads: number
  recentMessages: number
  latestActivityAt: string | null
}

export interface PeskidsBiTeacherMetrics {
  totalSubmissions: number
  reviewedCount: number
  pendingCount: number
  needsRevisionCount: number
  uniqueStudents: number
  uniqueFamilies: number
  averageGrade: number
  averageProgress: number
  activeChatThreads: number
  recentFamilyMessages: number
  latestActivityAt: string | null
}

export interface PeskidsBiAdminMetrics {
  activeStudents: number
  newLeads7d: number
  openFollowups: number
  activeChats: number
  avgSatisfaction: number
  alerts: string[]
}

export interface PeskidsBiTrendPoint {
  date: string
  leads: number
  messages: number
  followups: number
  feedback: number
}

export interface PeskidsBiSnapshot {
  generatedAt: string
  tenantId: string
  admin: PeskidsBiAdminMetrics
  teacher: PeskidsBiTeacherMetrics
  families: {
    byParentEmail: Record<string, PeskidsBiFamilyMetrics>
  }
  trends: PeskidsBiTrendPoint[]
}
