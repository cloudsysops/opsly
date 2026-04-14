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

export type TenantUsagePeriod = "today" | "month";

export type TenantUsageMetricsResponse = {
  tenant: string;
  period: TenantUsagePeriod;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
  cache_hit_rate: number;
  top_model: string | null;
};

export type TeamStatus = "active" | "idle" | "busy";

export type TeamMetrics = {
  name: string;
  specialization: string;
  max_parallel: number;
  handles: string[];
  status: TeamStatus;
  waiting?: number;
  active?: number;
};

export type TeamMetricsResponse = {
  teams: TeamMetrics[];
  total_parallel_capacity: number;
  timestamp: string;
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

export type CostLineStatus =
  | "active"
  | "approved"
  | "pending_approval"
  | "rejected"
  | "available";

export type CostLineItem = {
  name: string;
  cost: number;
  period: string;
  status: CostLineStatus;
  requires_approval?: boolean;
  requires_credit_card?: boolean;
  future_cost?: string;
  duration?: string;
  description: string;
  specs?: string;
};

export type CostAlert = {
  level: "info" | "warning";
  message: string;
  action: string;
};

export type BudgetAlertLevel = "ok" | "warning" | "critical";

export type TenantBudgetSnapshot = {
  tenant_slug: string;
  tenant_name: string;
  current_spend_usd: number;
  limit_usd: number;
  percent_used: number;
  alert_level: BudgetAlertLevel;
  enforcement_skipped: boolean;
  projected_month_end_usd: number;
};

export type LlmBudgetSummary = {
  tenant_count: number;
  tenants_at_warning: number;
  tenants_at_critical: number;
  total_spend_usd: number;
};

export type AdminCostsResponse = {
  current: Record<string, CostLineItem>;
  proposed: Record<string, CostLineItem>;
  summary: {
    currentMonthly: number;
    proposedMonthly: number;
    potentialSavings: number;
  };
  alerts: CostAlert[];
  lastUpdated: string;
  tenant_budgets: TenantBudgetSnapshot[];
  llm_budget_summary: LlmBudgetSummary;
};

export type CostDecisionResponse = {
  success: boolean;
  proposed?: CostLineItem;
  summary: AdminCostsResponse["summary"];
};

/** JSON de `scripts/mac2011-monitor.sh` expuesto por GET /api/monitoring/mac2011 */
export type Mac2011MonitoringStatus = {
  timestamp: string;
  hostname: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  docker: { containers: number };
  workers: {
    ollama: string;
    opsly_worker: string;
  };
  network: {
    vps_connection: string;
  };
};

/** GET /api/admin/docker/containers — inventario Docker del host de la API */
export type AdminDockerContainerRow = {
  id: string;
  names: string[];
  image: string;
  command: string;
  state: string;
  status: string;
  ports: string;
  created_at: string;
  running_for: string;
};

export type AdminDockerContainersResponse = {
  generated_at: string;
  docker_available: boolean;
  error: string | null;
  truncated: boolean;
  limit: number;
  containers: AdminDockerContainerRow[];
};

/** GET /api/admin/overview — plataforma: VPS, máquina local, Redis/BullMQ, LLM agregado */
export type AdminOverviewLlmPeriod = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
  top_model: string | null;
  cache_hit_rate: number;
};

export type AdminOverviewVpsHost = {
  mock: boolean;
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_used_gb: number;
  disk_total_gb: number;
  uptime_seconds: number;
  active_tenants: number;
  containers_running: number;
};

export type AdminOverviewQueueRow = {
  id: string;
  label: string;
  role: "orchestrator" | "agent_team";
  waiting: number;
  active: number;
};

export type AdminOverviewResponse = {
  generated_at: string;
  sources: Record<string, string>;
  vps_host: AdminOverviewVpsHost;
  local_machine: Partial<Mac2011MonitoringStatus> | null;
  local_machine_configured: boolean;
  workers: {
    redis_available: boolean;
    queues: AdminOverviewQueueRow[];
    totals: {
      orchestrator_jobs: number;
      agent_team_jobs: number;
      all_waiting: number;
      all_active: number;
    };
  };
  llm: {
    today: AdminOverviewLlmPeriod;
    month: AdminOverviewLlmPeriod;
    savings_estimate_usd_month: number;
    savings_note: string;
  };
};

/** Estado devuelto por GET /api/admin/ollama-demo?job_id= (proxy al orchestrator). */
export type OllamaDemoJobStatus = Record<string, unknown>;
