export type TenantStatus =
  | "provisioning"
  | "configuring"
  | "deploying"
  | "active"
  | "suspended"
  | "failed"
  | "deleted";

export type PlanKey = "startup" | "business" | "enterprise" | "demo";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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

export type DockerContainerState = "running" | "stopped" | "error";

export type ContainerStatus = {
  name: string;
  state: DockerContainerState;
  health: string;
};

/** Respuesta 200 de POST /api/invitations */
export type InvitationSendResponse = {
  ok: boolean;
  tenant_id: string;
  link: string;
  email: string;
  token: string;
};

export type MetricsResponse = {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  mrr_usd: number;
  tenants_by_plan: {
    startup: number;
    business: number;
    enterprise: number;
  };
};

/** Métricas del host vía Prometheus (API hace de proxy). */
export type SystemMetricsResponse = {
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  uptime_seconds: number;
  active_tenants: number;
  containers_running: number;
  mock: boolean;
};

export type TenantsListResponse = {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
};

export type TenantDetailResponse = {
  tenant: Tenant;
  stack_status: Record<string, DockerContainerState>;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  tenant_slug: string | null;
};
