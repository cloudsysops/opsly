export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type NotificationEventType =
  | 'submission_reviewed'
  | 'submission_observation'
  | 'submission_reassigned'
  | 'followup_due'
  | 'weekly_report';

export type Database = {
  peskids: {
    Tables: {
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          tenant_slug: string;
          email_enabled: boolean;
          whatsapp_enabled: boolean;
          inapp_enabled: boolean;
          events: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_slug?: string;
          email_enabled?: boolean;
          whatsapp_enabled?: boolean;
          inapp_enabled?: boolean;
          events?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email_enabled?: boolean;
          whatsapp_enabled?: boolean;
          inapp_enabled?: boolean;
          events?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tenant_slug: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_slug?: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          tenant_slug: string;
          type: string;
          title: string;
          body: string;
          metadata: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_slug?: string;
          type: string;
          title: string;
          body: string;
          metadata?: Record<string, unknown>;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
      pools: {
        Row: {
          id: string;
          tenant_slug: string;
          name: string;
          location: 'llanogrande' | 'domicilio';
          max_capacity: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          name: string;
          location: 'llanogrande' | 'domicilio';
          max_capacity: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['pools']['Insert']>;
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          tenant_slug: string;
          title: string;
          level: number;
          professor_user_id: string;
          pool_id: string;
          location: 'llanogrande' | 'domicilio';
          starts_at: string;
          ends_at: string;
          capacity: number;
          price_cents: number;
          currency: string;
          status: 'scheduled' | 'cancelled' | 'completed';
          cancelled_reason: string | null;
          session_notes: string | null;
          series_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          title: string;
          level: number;
          professor_user_id: string;
          pool_id: string;
          location: 'llanogrande' | 'domicilio';
          starts_at: string;
          ends_at: string;
          capacity: number;
          price_cents: number;
          currency?: string;
          status?: 'scheduled' | 'cancelled' | 'completed';
          cancelled_reason?: string | null;
          session_notes?: string | null;
          series_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['classes']['Insert']>;
        Relationships: [];
      };
      class_enrollments: {
        Row: {
          id: string;
          tenant_slug: string;
          class_id: string;
          student_id: string;
          family_user_id: string;
          status: 'reserved' | 'confirmed' | 'cancelled' | 'no_show' | 'attended';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          attendance: 'present' | 'absent' | 'excused' | null;
          joined_at: string;
          cancelled_at: string | null;
          stripe_checkout_session_id: string | null;
          payment_provider: 'stripe' | 'wompi';
          wompi_transaction_id: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          class_id: string;
          student_id: string;
          family_user_id: string;
          status?: 'reserved' | 'confirmed' | 'cancelled' | 'no_show' | 'attended';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          attendance?: 'present' | 'absent' | 'excused' | null;
          joined_at?: string;
          cancelled_at?: string | null;
          stripe_checkout_session_id?: string | null;
          payment_provider?: 'stripe' | 'wompi';
          wompi_transaction_id?: string | null;
        };
        Update: Partial<Database['peskids']['Tables']['class_enrollments']['Insert']>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          tenant_slug: string;
          family_user_id: string;
          enrollment_id: string | null;
          amount_cents: number;
          currency: string;
          status: 'pending' | 'paid' | 'failed' | 'refunded';
          stripe_payment_intent_id: string | null;
          stripe_checkout_session_id: string | null;
          paid_at: string | null;
          metadata: Json;
          created_at: string;
          provider: 'stripe' | 'wompi';
          wompi_transaction_id: string | null;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          family_user_id: string;
          enrollment_id?: string | null;
          amount_cents: number;
          currency?: string;
          status?: 'pending' | 'paid' | 'failed' | 'refunded';
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          paid_at?: string | null;
          metadata?: Json;
          created_at?: string;
          provider?: 'stripe' | 'wompi';
          wompi_transaction_id?: string | null;
        };
        Update: Partial<Database['peskids']['Tables']['payments']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          ghl_contact_id: string | null;
          tenant_id: string;
          name: string;
          email: string;
          phone: string | null;
          class_modality: 'llanogrande' | 'domicilio' | null;
          neighborhood: string | null;
          grade_interested: string;
          referral_source: string | null;
          referral_code: string | null;
          referred_by_code: string | null;
          referral_discount_cents: number;
          referral_redemptions: number;
          status: 'new' | 'contacted' | 'trial' | 'enrolled' | 'active' | 'renewal' | 'archived';
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ghl_contact_id?: string | null;
          tenant_id: string;
          name: string;
          email: string;
          phone?: string | null;
          class_modality?: 'llanogrande' | 'domicilio' | null;
          neighborhood?: string | null;
          grade_interested: string;
          referral_source?: string | null;
          referral_code?: string | null;
          referred_by_code?: string | null;
          referral_discount_cents?: number;
          referral_redemptions?: number;
          status?: 'new' | 'contacted' | 'trial' | 'enrolled' | 'active' | 'renewal' | 'archived';
          admin_notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['leads']['Insert']>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          ghl_contact_id: string | null;
          tenant_id: string;
          name: string;
          grade: string;
          status: 'active' | 'inactive';
          parent_email: string | null;
          parent_phone: string | null;
          family_user_id: string | null;
          source_lead_id: string | null;
          enrollment_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ghl_contact_id?: string | null;
          tenant_id: string;
          name: string;
          grade: string;
          status?: 'active' | 'inactive';
          parent_email?: string | null;
          parent_phone?: string | null;
          family_user_id?: string | null;
          source_lead_id?: string | null;
          enrollment_date?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
        Relationships: [];
      };
      trial_classes: {
        Row: {
          id: string;
          tenant_id: string;
          lead_id: string;
          student_id: string | null;
          scheduled_date: string;
          scheduled_time: string;
          modality: 'llanogrande' | 'domicilio';
          teacher_name: string | null;
          notes: string | null;
          status: 'scheduled' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          lead_id: string;
          student_id?: string | null;
          scheduled_date: string;
          scheduled_time: string;
          modality: 'llanogrande' | 'domicilio';
          teacher_name?: string | null;
          notes?: string | null;
          status?: 'scheduled' | 'confirmed' | 'attended' | 'no_show' | 'cancelled';
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['trial_classes']['Insert']>;
        Relationships: [];
      };
      tenant_settings: {
        Row: {
          tenant_id: string;
          academy_name: string;
          sede_label: string;
          support_email: string | null;
          support_phone: string | null;
          default_modality: 'llanogrande' | 'domicilio';
          default_capacity: number;
          default_price_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          academy_name?: string;
          sede_label?: string;
          support_email?: string | null;
          support_phone?: string | null;
          default_modality?: 'llanogrande' | 'domicilio';
          default_capacity?: number;
          default_price_cents?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tenant_settings']['Insert']>;
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          tenant_id: string;
          child_name: string;
          satisfaction: number;
          suggestion: string | null;
          contact_wanted: boolean;
          parent_email: string | null;
          author_type: 'parent' | 'teacher' | 'staff';
          author_ref_id: string | null;
          subject_type: 'general' | 'class' | 'student' | 'operations';
          subject_ref_id: string | null;
          visibility: 'public' | 'private';
          audience: 'family' | 'teacher' | 'admin';
          body: string | null;
          rating: number | null;
          status: 'new' | 'reviewed' | 'action_required' | 'closed';
          ai_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          child_name: string;
          satisfaction: number;
          suggestion?: string | null;
          contact_wanted?: boolean;
          parent_email?: string | null;
          author_type?: 'parent' | 'teacher' | 'staff';
          author_ref_id?: string | null;
          subject_type?: 'general' | 'class' | 'student' | 'operations';
          subject_ref_id?: string | null;
          visibility?: 'public' | 'private';
          audience?: 'family' | 'teacher' | 'admin';
          body?: string | null;
          rating?: number | null;
          status?: 'new' | 'reviewed' | 'action_required' | 'closed';
          ai_summary?: string | null;
        };
        Update: Partial<Database['public']['Tables']['feedback']['Insert']>;
        Relationships: [];
      };
      followups: {
        Row: {
          id: string;
          tenant_id: string;
          contact_id: string;
          contact_type: 'lead' | 'student' | 'parent';
          type: 'call' | 'email' | 'sms' | 'in-person';
          due_date: string;
          status: 'pending' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
          twenty_task_id: string | null;
        };
        Insert: {
          tenant_id: string;
          contact_id: string;
          contact_type: 'lead' | 'student' | 'parent';
          type: 'call' | 'email' | 'sms' | 'in-person';
          due_date: string;
          status?: 'pending' | 'completed' | 'cancelled';
          notes?: string | null;
          updated_at?: string;
          twenty_task_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['followups']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          tenant_id: string;
          source: 'whatsapp' | 'instagram' | 'web';
          sender_name: string | null;
          sender_contact: string;
          message_text: string;
          external_id: string | null;
          direction: 'inbound' | 'draft' | 'outbound';
          parent_message_id: string | null;
          status: 'pending' | 'pending_approval' | 'approved' | 'sent' | 'failed' | 'skipped' | null;
          ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          source: 'whatsapp' | 'instagram' | 'web';
          sender_name?: string | null;
          sender_contact: string;
          message_text: string;
          external_id?: string | null;
          direction?: 'inbound' | 'draft' | 'outbound';
          parent_message_id?: string | null;
          status?: 'pending' | 'pending_approval' | 'approved' | 'sent' | 'failed' | 'skipped' | null;
          ai_generated?: boolean;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      webhook_logs: {
        Row: {
          id: string;
          tenant_id: string;
          provider: string;
          event_type: string;
          record_id: string;
          payload: Json;
          received_at: string;
        };
        Insert: {
          tenant_id: string;
          provider: string;
          event_type: string;
          record_id: string;
          payload: Json;
          received_at?: string;
        };
        Update: Partial<Database['public']['Tables']['webhook_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export interface OpslyEvent {
  event_type: string;
  tenant_id: string;
  created_at: string;
  data: Record<string, unknown>;
  trace_id?: string;
}

export interface DashboardOperationsMetrics {
  classes_today: number;
  enrollments_today: number;
  attendance_rate_pct: number | null;
  revenue_month_cents: number;
  revenue_month_by_provider: {
    stripe_cents: number;
    wompi_cents: number;
  };
  pending_payments_cents: number;
}

export interface DashboardIntegrationStatusItem {
  label: string;
  enabled: boolean;
  status: 'ok' | 'warning' | 'offline' | 'disabled';
  detail: string;
  url: string | null;
  checked_at: string | null;
}

export interface DashboardIntegrationStatus {
  twenty: DashboardIntegrationStatusItem;
  ghl: DashboardIntegrationStatusItem;
  n8n: DashboardIntegrationStatusItem;
  wacrm: DashboardIntegrationStatusItem;
}

export interface DashboardSalesAnalytics {
  leads_by_day: Array<{
    date: string;
    total: number;
    synced_to_twenty: number;
  }>;
  lead_status_counts: Record<
    'new' | 'contacted' | 'trial' | 'enrolled' | 'active' | 'renewal' | 'archived',
    number
  >;
  source_breakdown: Array<{
    key: 'instagram' | 'facebook' | 'website' | 'referral' | 'other';
    label: string;
    count: number;
  }>;
  avg_hours_to_first_followup: number | null;
  avg_hours_to_trial: number | null;
  trials_scheduled_count: number;
}

export interface DashboardData {
  new_leads_count: number;
  converted_leads_count: number;
  conversion_rate_pct: number | null;
  lead_sources: {
    instagram: number;
    facebook: number;
    website: number;
    referral: number;
    other: number;
  };
  new_leads: Array<
    Pick<
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
      | 'created_at'
    > & {
      referral_source?: string | null;
      twenty_person_id?: string | null;
      twenty_opportunity_id?: string | null;
      twenty_person_url?: string | null;
      twenty_opportunity_url?: string | null;
      twenty_sync_status?: 'synced' | 'warning' | 'pending';
    }
  >;
  active_students_count: number;
  families_active_count: number;
  students_by_grade: Record<string, number>;
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
  >[];
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
  >[];
  pending_followups_count: number;
  pending_followups: Pick<
    Database['public']['Tables']['followups']['Row'],
    'id' | 'contact_id' | 'contact_type' | 'due_date' | 'type' | 'status' | 'notes'
  >[];
  followups: Pick<
    Database['public']['Tables']['followups']['Row'],
    'id' | 'contact_id' | 'contact_type' | 'due_date' | 'type' | 'status' | 'notes'
  >[];
  recent_messages: Array<
    Pick<
      Database['public']['Tables']['messages']['Row'],
      | 'id'
      | 'source'
      | 'sender_name'
      | 'sender_contact'
      | 'message_text'
      | 'created_at'
      | 'status'
      | 'direction'
      | 'external_id'
    > & {
      conversation_mode: 'admissions' | 'support';
    }
  >;
  /** Full inbound+outbound wacrm history (not tenant-wide capped at 10 like
   * recent_messages) — feeds the per-lead wacrm inbox badge, which needs a
   * contact's whole thread to tell "no conversation" apart from "pending"/"responded". */
  wacrm_messages: Array<
    Pick<
      Database['public']['Tables']['messages']['Row'],
      'sender_contact' | 'message_text' | 'created_at' | 'status' | 'direction' | 'external_id'
    >
  >;
  operations: DashboardOperationsMetrics;
  integration_status: DashboardIntegrationStatus;
  sales_analytics: DashboardSalesAnalytics;
}

export interface PeskidsBiSnapshot {
  generated_at: string;
  leads: {
    total: number;
    by_status: Record<string, number>;
    by_source: Record<string, number>;
    by_modality: Record<string, number>;
  };
  students: {
    active: number;
    by_grade: Record<string, number>;
  };
  feedback: {
    avg_rating: number;
    total: number;
    low_satisfaction_count: number;
  };
  families: {
    byParentEmail: Record<string, unknown>;
  };
  teacher?: {
    byTeacherEmail: Record<string, unknown>;
    submissions: unknown[];
    avgRating: number;
    totalSubmissions: number;
    uniqueStudents: number;
  };
  revenue?: {
    mrr: number;
    arr: number;
  };
}
