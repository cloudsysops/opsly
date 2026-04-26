export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TenantStatus =
  | 'provisioning'
  | 'configuring'
  | 'deploying'
  | 'active'
  | 'suspended'
  | 'failed'
  | 'deleted';

export type PlanKey = 'startup' | 'business' | 'enterprise' | 'demo';

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

export type TenantUpdate = Partial<Omit<Tenant, 'id'>>;

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

export type SubscriptionUpdate = Partial<Omit<Subscription, 'id' | 'tenant_id'>>;

export type AuditLog = {
  id: string;
  tenant_id: string | null;
  action: string;
  actor: string;
  metadata: Json;
  created_at: string;
};

export type AuditLogInsert = {
  id?: string;
  tenant_id?: string | null;
  action: string;
  actor: string;
  metadata?: Json;
  created_at?: string;
};

export type ApiKey = {
  id: string;
  tenant_id: string;
  key_hash: string;
  key_prefix: string;
  name: string | null;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export type ApiKeyInsert = {
  id?: string;
  tenant_id: string;
  key_hash: string;
  key_prefix: string;
  name?: string | null;
  last_used_at?: string | null;
  created_at?: string;
  revoked_at?: string | null;
};

export type ConversionEventName =
  | 'page_visit'
  | 'onboard_started'
  | 'onboard_completed'
  | 'demo_created'
  | 'demo_expired'
  | 'demo_converted'
  | 'paid_activated';

export type ConversionEvent = {
  id: string;
  event: ConversionEventName;
  tenant_id: string | null;
  session_id: string | null;
  metadata: Json;
  created_at: string;
};

export type ConversionEventInsert = {
  id?: string;
  event: ConversionEventName;
  tenant_id?: string | null;
  session_id?: string | null;
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

export type PortAllocationUpdate = Partial<Omit<PortAllocation, 'port'>>;

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
        Row: AuditLog;
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
      };
      port_allocations: {
        Row: PortAllocation;
        Insert: PortAllocationInsert;
        Update: PortAllocationUpdate;
      };
      api_keys: {
        Row: ApiKey;
        Insert: ApiKeyInsert;
        Update: Partial<ApiKeyInsert>;
      };
      conversion_events: {
        Row: ConversionEvent;
        Insert: ConversionEventInsert;
        Update: Partial<ConversionEventInsert>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
