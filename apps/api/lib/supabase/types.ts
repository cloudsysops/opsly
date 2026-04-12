export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TenantStatus =
  | "provisioning"
  | "configuring"
  | "deploying"
  | "active"
  | "suspended"
  | "failed"
  | "deleted";

export type PlanKey = "startup" | "business" | "enterprise" | "demo";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  owner_email: string;
  plan: PlanKey;
  status: TenantStatus;
  progress: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  doppler_project: string | null;
  services: Json;
  is_demo: boolean | null;
  demo_expires_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TenantInsert = {
  id?: string;
  slug: string;
  name: string;
  owner_email: string;
  plan: PlanKey;
  status?: TenantStatus;
  progress?: number | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  doppler_project?: string | null;
  services?: Json;
  is_demo?: boolean | null;
  demo_expires_at?: string | null;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type TenantUpdate = Partial<Omit<Tenant, "id">>;

export type Subscription = {
  id: string;
  tenant_id: string;
  stripe_event_id: string;
  stripe_status: string;
  current_period_end: string | null;
  plan: string | null;
  created_at: string;
};

export type SubscriptionInsert = {
  id?: string;
  tenant_id: string;
  stripe_event_id: string;
  stripe_status: string;
  current_period_end?: string | null;
  plan?: string | null;
  created_at?: string;
};

export type SubscriptionUpdate = Partial<
  Omit<Subscription, "id" | "tenant_id">
>;

export type AuditLogInsert = {
  id?: string;
  tenant_id?: string | null;
  action: string;
  actor: string;
  metadata?: Json;
  created_at?: string;
};

export type PortAllocation = {
  port: number;
  tenant_id: string | null;
  service: string;
  allocated_at: string;
};

export type PortAllocationInsert = {
  port: number;
  tenant_id?: string | null;
  service: string;
  allocated_at?: string;
};

export type PortAllocationUpdate = Partial<Omit<PortAllocation, "port">>;

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      opsly_admin_metrics: {
        Args: { p_month_start: string };
        Returns: Json;
      };
      opsly_admin_tenants_page: {
        Args: { p_limit: number; p_offset: number };
        Returns: Json;
      };
      opsly_admin_revenue_by_month: {
        Args: { p_months?: number };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
  platform: {
    Tables: {
      tenants: {
        Row: Tenant;
        Insert: TenantInsert;
        Update: TenantUpdate;
      };
      subscriptions: {
        Row: Subscription;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
      };
      audit_log: {
        Row: {
          id: string;
          tenant_id: string | null;
          action: string;
          actor: string;
          metadata: Json;
          created_at: string;
        };
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
      };
      port_allocations: {
        Row: PortAllocation;
        Insert: PortAllocationInsert;
        Update: PortAllocationUpdate;
      };
      api_keys: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      conversion_events: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      usage_events: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      feedback_conversations: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      feedback_messages: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      feedback_decisions: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      agent_teams: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      agent_executions: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      billing_usage: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      tenant_limits: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      sprints: {
        Row: {
          id: string;
          tenant_id: string;
          goal: string;
          status: string;
          steps: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          goal: string;
          status?: string;
          steps?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          goal: string;
          status: string;
          steps: Json;
          updated_at: string;
        }>;
      };
      hermes_state: {
        Row: {
          task_id: string;
          name: string;
          task_type: string;
          state: string;
          assignee: string | null;
          effort: string;
          agent: string | null;
          payload: Json;
          started_at: string | null;
          completed_at: string | null;
          result: Json | null;
          idempotency_key: string | null;
          request_id: string | null;
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          task_id: string;
          name?: string;
          task_type?: string;
          state: string;
          assignee?: string | null;
          effort?: string;
          agent?: string | null;
          payload?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          result?: Json | null;
          idempotency_key?: string | null;
          request_id?: string | null;
          tenant_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          task_type: string;
          state: string;
          assignee: string | null;
          effort: string;
          agent: string | null;
          payload: Json;
          started_at: string | null;
          completed_at: string | null;
          result: Json | null;
          idempotency_key: string | null;
          request_id: string | null;
          tenant_id: string | null;
          updated_at: string;
        }>;
      };
      hermes_workflows: {
        Row: {
          workflow_id: string;
          name: string;
          status: string;
          steps: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          workflow_id?: string;
          name: string;
          status?: string;
          steps?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          name: string;
          status: string;
          steps: Json;
          updated_at: string;
        }>;
      };
      hermes_metrics: {
        Row: {
          id: string;
          agent: string;
          sprint: number | null;
          tasks_completed: number;
          tasks_failed: number;
          avg_duration_ms: number | null;
          success_rate: number | null;
          captured_at: string;
        };
        Insert: {
          id?: string;
          agent: string;
          sprint?: number | null;
          tasks_completed?: number;
          tasks_failed?: number;
          avg_duration_ms?: number | null;
          success_rate?: number | null;
          captured_at?: string;
        };
        Update: Partial<{
          tasks_completed: number;
          tasks_failed: number;
          avg_duration_ms: number | null;
          success_rate: number | null;
          captured_at: string;
        }>;
      };
      hermes_audit: {
        Row: {
          id: string;
          event_type: string;
          task_id: string | null;
          agent: string | null;
          change: Json | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          task_id?: string | null;
          agent?: string | null;
          change?: Json | null;
          timestamp?: string;
        };
        Update: Partial<{
          event_type: string;
          task_id: string | null;
          agent: string | null;
          change: Json | null;
          timestamp: string;
        }>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
