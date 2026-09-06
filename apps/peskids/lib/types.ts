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
          franchise_id: string | null;
          name: string;
          location: 'llanogrande' | 'domicilio';
          max_capacity: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          franchise_id?: string | null;
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
          franchise_id: string | null;
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
          franchise_id?: string | null;
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
        Relationships: [
          {
            foreignKeyName: 'classes_pool_id_fkey';
            columns: ['pool_id'];
            isOneToOne: false;
            referencedRelation: 'pools';
            referencedColumns: ['id'];
          },
        ];
      };
      class_enrollments: {
        Row: {
          id: string;
          tenant_slug: string;
          class_id: string;
          student_id: string;
          family_user_id: string;
          status: 'reserved' | 'confirmed' | 'cancelled' | 'no_show' | 'attended' | 'waitlisted';
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
          attendance: 'present' | 'absent' | 'excused' | null;
          behavior_tags: string[];
          teacher_note: string | null;
          attendance_updated_at: string | null;
          attendance_updated_by: string | null;
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
          status?: 'reserved' | 'confirmed' | 'cancelled' | 'no_show' | 'attended' | 'waitlisted';
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
          attendance?: 'present' | 'absent' | 'excused' | null;
          behavior_tags?: string[];
          teacher_note?: string | null;
          attendance_updated_at?: string | null;
          attendance_updated_by?: string | null;
          joined_at?: string;
          cancelled_at?: string | null;
          stripe_checkout_session_id?: string | null;
          payment_provider?: 'stripe' | 'wompi';
          wompi_transaction_id?: string | null;
        };
        Update: Partial<Database['peskids']['Tables']['class_enrollments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'class_enrollments_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      student_badges: {
        Row: {
          id: string;
          tenant_slug: string;
          student_id: string;
          label: string;
          class_id: string | null;
          awarded_by: string | null;
          awarded_by_role: 'owner' | 'admin' | 'support' | 'teacher' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          student_id: string;
          label: string;
          class_id?: string | null;
          awarded_by?: string | null;
          awarded_by_role?: 'owner' | 'admin' | 'support' | 'teacher' | null;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['student_badges']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'student_badges_class_id_fkey';
            columns: ['class_id'];
            isOneToOne: false;
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
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
      forms: {
        Row: {
          id: string;
          form_id: string;
          tenant_slug: string;
          title: string;
          description: string | null;
          status: 'active' | 'archived';
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          tenant_slug?: string;
          title: string;
          description?: string | null;
          status?: 'active' | 'archived';
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['forms']['Insert']>;
        Relationships: [];
      };
      form_fields: {
        Row: {
          id: string;
          form_id: string;
          field_id: string;
          field_type: string;
          label: string;
          placeholder: string | null;
          required: boolean;
          options: Json | null;
          validation: Json | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          form_id: string;
          field_id: string;
          field_type: string;
          label: string;
          placeholder?: string | null;
          required?: boolean;
          options?: Json | null;
          validation?: Json | null;
          order_index?: number;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['form_fields']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'form_fields_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'forms';
            referencedColumns: ['id'];
          },
        ];
      };
      form_submissions: {
        Row: {
          id: string;
          submission_id: string;
          tenant_slug: string;
          form_id: string;
          user_id: string | null;
          form_data: Json;
          status: 'started' | 'submitted' | 'reviewed' | 'graded';
          score: number | null;
          feedback: string | null;
          ip_address: string | null;
          user_agent: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          twenty_person_id: string | null;
          twenty_synced_at: string | null;
        };
        Insert: {
          id?: string;
          submission_id: string;
          tenant_slug?: string;
          form_id: string;
          user_id?: string | null;
          form_data?: Json;
          status?: 'started' | 'submitted' | 'reviewed' | 'graded';
          score?: number | null;
          feedback?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          twenty_person_id?: string | null;
          twenty_synced_at?: string | null;
        };
        Update: Partial<Database['peskids']['Tables']['form_submissions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'form_submissions_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'forms';
            referencedColumns: ['id'];
          },
        ];
      };
      form_templates: {
        Row: {
          id: string;
          tenant_slug: string;
          name: string;
          description: string | null;
          form_type: 'enrolled_family' | 'prospective_family' | 'trial_class';
          fields: Json;
          status: 'active' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          name: string;
          description?: string | null;
          form_type: 'enrolled_family' | 'prospective_family' | 'trial_class';
          fields?: Json;
          status?: 'active' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['form_templates']['Insert']>;
        Relationships: [];
      };
      form_deliveries: {
        Row: {
          id: string;
          tenant_slug: string;
          template_id: string;
          recipient_email: string;
          recipient_phone: string | null;
          recipient_name: string | null;
          delivery_method: 'email' | 'sms' | 'whatsapp';
          sent_at: string | null;
          delivery_status: 'pending' | 'sent' | 'failed' | 'bounced';
          form_link: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          template_id: string;
          recipient_email: string;
          recipient_phone?: string | null;
          recipient_name?: string | null;
          delivery_method: 'email' | 'sms' | 'whatsapp';
          sent_at?: string | null;
          delivery_status?: 'pending' | 'sent' | 'failed' | 'bounced';
          form_link?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['form_deliveries']['Insert']>;
        Relationships: [];
      };
      form_responses: {
        Row: {
          id: string;
          tenant_slug: string;
          delivery_id: string;
          template_id: string;
          response_data: Json;
          ip_address: string | null;
          submitted_at: string;
          crm_synced_at: string | null;
          crm_sync_status: 'pending' | 'synced' | 'failed' | null;
          crm_contact_id: string | null;
          trial_class_scheduled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          delivery_id: string;
          template_id: string;
          response_data: Json;
          ip_address?: string | null;
          submitted_at?: string;
          crm_synced_at?: string | null;
          crm_sync_status?: 'pending' | 'synced' | 'failed' | null;
          crm_contact_id?: string | null;
          trial_class_scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['form_responses']['Insert']>;
        Relationships: [];
      };
      student_points: {
        Row: {
          id: string;
          tenant_slug: string;
          student_id: string;
          current_balance: number;
          total_earned: number;
          total_redeemed: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          student_id: string;
          current_balance?: number;
          total_earned?: number;
          total_redeemed?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['student_points']['Insert']>;
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          tenant_slug: string;
          student_id: string;
          transaction_type: 'earned' | 'redeemed';
          points_amount: number;
          description: string | null;
          related_order_id: string | null;
          related_subscription_id: string | null;
          related_payment_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          student_id: string;
          transaction_type: 'earned' | 'redeemed';
          points_amount: number;
          description?: string | null;
          related_order_id?: string | null;
          related_subscription_id?: string | null;
          related_payment_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['point_transactions']['Insert']>;
        Relationships: [];
      };
      store_products: {
        Row: {
          id: string;
          tenant_slug: string;
          category: 'utilities' | 'merchandise' | 'services';
          title: string;
          description: string | null;
          price_cents: number;
          currency: string | null;
          image_url: string | null;
          inventory_count: number | null;
          active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          category: 'utilities' | 'merchandise' | 'services';
          title: string;
          description?: string | null;
          price_cents: number;
          currency?: string | null;
          image_url?: string | null;
          inventory_count?: number | null;
          active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['store_products']['Insert']>;
        Relationships: [];
      };
      store_cart_items: {
        Row: {
          id: string;
          tenant_slug: string;
          student_id: string;
          product_id: string;
          quantity: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          student_id: string;
          product_id: string;
          quantity?: number;
          added_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['store_cart_items']['Insert']>;
        Relationships: [];
      };
      store_orders: {
        Row: {
          id: string;
          tenant_slug: string;
          student_id: string;
          total_cents: number;
          discount_cents: number | null;
          final_amount_cents: number;
          referral_code_used: string | null;
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | null;
          order_status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null;
          stripe_payment_intent_id: string | null;
          wompi_transaction_id: string | null;
          created_at: string;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          student_id: string;
          total_cents: number;
          discount_cents?: number | null;
          final_amount_cents: number;
          referral_code_used?: string | null;
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded' | null;
          order_status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | null;
          stripe_payment_intent_id?: string | null;
          wompi_transaction_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['store_orders']['Insert']>;
        Relationships: [];
      };
      store_order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity?: number;
          unit_price_cents: number;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['store_order_items']['Insert']>;
        Relationships: [];
      };
      referral_links: {
        Row: {
          id: string;
          tenant_slug: string;
          referrer_id: string;
          referrer_name: string;
          code: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          referrer_id: string;
          referrer_name: string;
          code: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['referral_links']['Insert']>;
        Relationships: [];
      };
      referral_redemptions: {
        Row: {
          id: string;
          tenant_slug: string;
          referral_link_id: string | null;
          referral_code: string | null;
          referee_contact_id: string;
          referee_email: string | null;
          status: 'pending' | 'completed' | 'failed';
          reward: string | number | null;
          redeemed_at: string | null;
          completed_at: string | null;
          failure_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_slug?: string;
          referral_link_id?: string | null;
          referral_code?: string | null;
          referee_contact_id: string;
          referee_email?: string | null;
          status?: 'pending' | 'completed' | 'failed';
          reward?: string | number | null;
          redeemed_at?: string | null;
          completed_at?: string | null;
          failure_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['peskids']['Tables']['referral_redemptions']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      log_audit_event: {
        Args: {
          p_tenant_slug: string;
          p_actor_id: string;
          p_action: string;
          p_resource_type: string;
          p_resource_id: string;
          p_metadata?: Json;
          p_ip_address?: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          twenty_person_id: string | null;
          tenant_id: string;
          franchise_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          lead_type: 'family' | 'teacher_applicant' | 'company';
          service_mode: 'llanogrande' | 'domicilio' | 'institutional' | null;
          class_modality: 'llanogrande' | 'domicilio' | null;
          neighborhood: string | null;
          grade_interested: string;
          child_name: string | null;
          birth_date: string | null;
          document_type: string | null;
          document_number: string | null;
          company_name: string | null;
          company_nit: string | null;
          metadata: Record<string, unknown>;
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
          twenty_person_id?: string | null;
          tenant_id: string;
          franchise_id?: string | null;
          name: string;
          email: string;
          phone?: string | null;
          lead_type?: 'family' | 'teacher_applicant' | 'company';
          service_mode?: 'llanogrande' | 'domicilio' | 'institutional' | null;
          class_modality?: 'llanogrande' | 'domicilio' | null;
          neighborhood?: string | null;
          grade_interested: string;
          child_name?: string | null;
          birth_date?: string | null;
          document_type?: string | null;
          document_number?: string | null;
          company_name?: string | null;
          company_nit?: string | null;
          metadata?: Record<string, unknown>;
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
          tenant_id: string;
          franchise_id: string | null;
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
          tenant_id: string;
          franchise_id?: string | null;
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
          franchise_id: string | null;
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
          franchise_id?: string | null;
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
          franchise_id: string | null;
          contact_id: string;
          contact_type: 'lead' | 'student' | 'parent';
          type: 'call' | 'email' | 'sms' | 'in-person';
          due_date: string;
          status: 'pending' | 'completed' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
          twenty_task_id: string | null;
          sync_status: 'pending' | 'synced' | 'failed' | 'retrying' | 'skipped' | null;
          sync_error: string | null;
          retry_count: number;
        };
        Insert: {
          tenant_id: string;
          franchise_id?: string | null;
          contact_id: string;
          contact_type: 'lead' | 'student' | 'parent';
          type: 'call' | 'email' | 'sms' | 'in-person';
          due_date: string;
          status?: 'pending' | 'completed' | 'cancelled';
          notes?: string | null;
          updated_at?: string;
          twenty_task_id?: string | null;
          sync_status?: 'pending' | 'synced' | 'failed' | 'retrying' | 'skipped' | null;
          sync_error?: string | null;
          retry_count?: number;
        };
        Update: Partial<Database['public']['Tables']['followups']['Insert']>;
        Relationships: [];
      };
      staff_improvement_messages: {
        Row: {
          id: string;
          tenant_id: string;
          role: 'staff' | 'assistant';
          author_email: string | null;
          body: string;
          category: 'bug' | 'feature' | 'improvement' | 'security' | 'billing' | 'question' | 'other' | null;
          priority: 'alta' | 'media' | 'baja' | null;
          ai_summary: string | null;
          twenty_task_id: string | null;
          /** Intake lifecycle + legacy task_created/dismissed. */
          status:
            | 'new'
            | 'analyzed'
            | 'task_created'
            | 'triaged'
            | 'approved'
            | 'in_progress'
            | 'shipped'
            | 'rejected'
            | 'dismissed';
          attachments: Array<{
            name: string;
            mime_type: string;
            size_bytes: number;
            storage_path?: string | null;
            content_base64?: string | null;
          }>;
          operator_notes: string | null;
          linked_pr: string | null;
          linked_issue: string | null;
          /** Built on human approve — never auto-executed. */
          agent_ticket: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id?: string;
          role: 'staff' | 'assistant';
          author_email?: string | null;
          body: string;
          category?: 'bug' | 'feature' | 'improvement' | 'security' | 'billing' | 'question' | 'other' | null;
          priority?: 'alta' | 'media' | 'baja' | null;
          ai_summary?: string | null;
          twenty_task_id?: string | null;
          status?:
            | 'new'
            | 'analyzed'
            | 'task_created'
            | 'triaged'
            | 'approved'
            | 'in_progress'
            | 'shipped'
            | 'rejected'
            | 'dismissed';
          attachments?: Array<{
            name: string;
            mime_type: string;
            size_bytes: number;
            storage_path?: string | null;
            content_base64?: string | null;
          }>;
          operator_notes?: string | null;
          linked_pr?: string | null;
          linked_issue?: string | null;
          agent_ticket?: Record<string, unknown> | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_improvement_messages']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          tenant_id: string;
          franchise_id: string | null;
          source: 'whatsapp' | 'instagram' | 'web';
          sender_name: string | null;
          sender_contact: string;
          message_text: string;
          external_id: string | null;
          direction: 'inbound' | 'draft' | 'outbound';
          parent_message_id: string | null;
          status:
            | 'pending'
            | 'pending_approval'
            | 'approved'
            | 'sent'
            | 'failed'
            | 'skipped'
            | null;
          ai_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          franchise_id?: string | null;
          source: 'whatsapp' | 'instagram' | 'web';
          sender_name?: string | null;
          sender_contact: string;
          message_text: string;
          external_id?: string | null;
          direction?: 'inbound' | 'draft' | 'outbound';
          parent_message_id?: string | null;
          status?:
            | 'pending'
            | 'pending_approval'
            | 'approved'
            | 'sent'
            | 'failed'
            | 'skipped'
            | null;
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
  modality_breakdown: Array<{
    key: 'llanogrande' | 'domicilio' | 'other';
    label: string;
    total: number;
    enrolled: number;
    conversion_pct: number | null;
  }>;
  avg_hours_to_first_followup: number | null;
  avg_hours_to_trial: number | null;
  trials_scheduled_count: number;
}

/** PR-PRO-8 — rule-based executive snapshot for the admin home. */
export interface DashboardExecutiveSummary {
  timezone: string;
  as_of: string;
  greeting: string;
  summary_line: string;
  kpis: {
    new_leads: number;
    uncontacted: number;
    overdue_followups: number;
    trials_today: number;
    trials_this_week: number;
    enrollments_this_month: number;
    lead_to_trial_pct: number | null;
    trial_to_enroll_pct: number | null;
    avg_hours_to_first_contact: number | null;
    best_source: {
      key: string;
      label: string;
      conversion_pct: number;
      sample_size: number;
    } | null;
  };
  priority_tasks: Array<{
    id: string;
    priority: number;
    title: string;
    detail: string;
    href: string;
    tone: 'coral' | 'amber' | 'teal' | 'green';
  }>;
  agenda_today: Array<{
    id: string;
    kind: 'trial' | 'followup';
    title: string;
    time_label: string;
    href: string;
  }>;
  funnel: Array<{
    stage: string;
    label: string;
    count: number;
  }>;
  recent_activity: Array<{
    id: string;
    at: string;
    label: string;
    href?: string;
  }>;
  integration_issues: Array<{
    label: string;
    detail: string;
    status: string;
  }>;
  recommended_actions: Array<{
    title: string;
    detail: string;
    href: string;
  }>;
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
      franchise_id?: string | null;
      lead_type?: Database['public']['Tables']['leads']['Row']['lead_type'];
      service_mode?: Database['public']['Tables']['leads']['Row']['service_mode'];
      child_name?: string | null;
      birth_date?: string | null;
      document_type?: string | null;
      document_number?: string | null;
      /** True only after a trial_classes row reaches status=attended. */
      first_class_attended?: boolean;
      /** Hours from lead creation to the first recorded support contact. */
      first_contact_hours?: number | null;
      company_name?: string | null;
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
  executive: DashboardExecutiveSummary;
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
