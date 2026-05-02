import { getSessionAuthToken } from './session-auth';
import type {
  AgentsTeamResponse,
  AdminCostsResponse,
  AdminDockerContainersResponse,
  AdminOverviewResponse,
  CostDecisionResponse,
  InvitationSendResponse,
  Mac2011MonitoringStatus,
  MetricsResponse,
  OllamaDemoJobStatus,
  SystemMetricsResponse,
  TeamMetricsResponse,
  Tenant,
  TenantDetailResponse,
  TenantUsageMetricsResponse,
  TenantsListResponse,
} from './types';

const REQUEST_TIMEOUT_MS = 2_000;

function inferApiBaseFromAdminHost(hostname: string): string | null {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3000';
  }
  if (hostname.startsWith('admin.')) {
    return `https://api.${hostname.slice('admin.'.length)}`;
  }
  return null;
}

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base && base.length > 0) {
    return base.replace(/\/$/, '');
  }
  if (globalThis.window !== undefined) {
    const inferred = inferApiBaseFromAdminHost(globalThis.window.location.hostname);
    if (inferred !== null) {
      return inferred;
    }
  }
  return 'http://127.0.0.1:3000';
}

export { getBaseUrl };

function shouldUseLocalDemoData(): boolean {
  if (globalThis.window === undefined) {
    return false;
  }
  const { hostname } = globalThis.window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

async function buildHeaders(initHeaders: HeadersInit | undefined): Promise<Headers> {
  const headers = new Headers(initHeaders);
  headers.set('Content-Type', 'application/json');
  const authToken = await getSessionAuthToken();
  if (authToken !== null && authToken.length > 0) {
    headers.set('Authorization', `Bearer ${authToken}`);
    return headers;
  }
  const adminToken = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN?.trim() ?? '';
  if (adminToken.length > 0) {
    headers.set('Authorization', `Bearer ${adminToken}`);
    headers.set('x-admin-token', adminToken);
  }
  return headers;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Invalid JSON response');
  }
}

function getErrorMessage(data: unknown): string {
  if (
    data !== null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  ) {
    return (data as { error: string }).error;
  }
  return 'Request failed';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await buildHeaders(init?.headers);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...init,
      headers,
      signal: init?.signal ?? controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`API timeout after ${REQUEST_TIMEOUT_MS / 1000}s: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await parseJson(res);

  if (!res.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data as T;
}

export type ListTenantsParams = {
  page?: number;
  limit?: number;
  status?: string;
  plan?: string;
};

function demoTenant(slug: string, plan: Tenant['plan'], status: Tenant['status']): Tenant {
  const now = new Date().toISOString();
  return {
    id: `demo-${slug}`,
    slug,
    name: slug.replaceAll('-', ' '),
    owner_email: `owner+${slug}@opsly.local`,
    plan,
    status,
    progress: status === 'active' ? 100 : 65,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    doppler_project: null,
    services: {
      n8n_url: `https://n8n-${slug}.ops.smiletripcare.com`,
      uptime_url: `https://uptime-${slug}.ops.smiletripcare.com`,
    },
    is_demo: true,
    demo_expires_at: null,
    metadata: { source: 'admin-local-fallback' },
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}

function demoTenants(): TenantsListResponse {
  const data = [
    demoTenant('smiletripcare', 'business', 'active'),
    demoTenant('localrank', 'startup', 'active'),
    demoTenant('legalvial', 'startup', 'active'),
    demoTenant('peskids', 'business', 'active'),
  ];
  return {
    data,
    total: data.length,
    page: 1,
    limit: 20,
  };
}

export function demoSystemMetrics(): SystemMetricsResponse {
  return {
    cpu_percent: 18,
    ram_used_gb: 5.8,
    ram_total_gb: 16,
    disk_used_gb: 128,
    disk_total_gb: 512,
    uptime_seconds: 86400 * 12 + 3600 * 4,
    active_tenants: 4,
    containers_running: 18,
    mock: true,
  };
}

export function demoAdminOverview(): AdminOverviewResponse {
  return {
    generated_at: '2026-05-02T00:00:00.000Z',
    sources: { mode: 'admin-local-fallback' },
    vps_host: {
      mock: true,
      cpu_percent: 22,
      ram_used_gb: 1.8,
      ram_total_gb: 2,
      disk_used_gb: 38,
      disk_total_gb: 80,
      uptime_seconds: 86400 * 10,
      active_tenants: 6,
      containers_running: 22,
    },
    local_machine: null,
    local_machine_configured: false,
    workers: {
      redis_available: false,
      queues: [
        { id: 'openclaw', label: 'OpenClaw', role: 'orchestrator', waiting: 0, active: 0 },
        { id: 'agents', label: 'Agent Teams', role: 'agent_team', waiting: 0, active: 0 },
      ],
      totals: {
        orchestrator_jobs: 0,
        agent_team_jobs: 0,
        all_waiting: 0,
        all_active: 0,
      },
    },
    llm: {
      today: {
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        requests: 0,
        cache_hits: 0,
        top_model: null,
        cache_hit_rate: 0,
      },
      month: {
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        requests: 0,
        cache_hits: 0,
        top_model: null,
        cache_hit_rate: 0,
      },
      savings_estimate_usd_month: 0,
      savings_note: 'Fallback local: conecta NEXT_PUBLIC_API_URL para métricas reales.',
    },
  };
}

function demoAdminCosts(): AdminCostsResponse {
  return {
    current: {
      vps: {
        name: 'DigitalOcean VPS',
        cost: 12,
        period: 'monthly',
        status: 'active',
        description: 'Servidor actual de control plane.',
        specs: 'Fallback local',
      },
    },
    proposed: {
      cloudflare_lb: {
        name: 'Cloudflare Load Balancer',
        cost: 5,
        period: 'monthly',
        status: 'pending_approval',
        requires_approval: true,
        description: 'Alta disponibilidad futura; pendiente de aprobación humana.',
      },
    },
    summary: {
      currentMonthly: 12,
      proposedMonthly: 17,
      potentialSavings: 0,
    },
    alerts: [
      {
        level: 'info',
        message: 'Fallback local: API no disponible o sin sesión admin.',
        action: 'Configura NEXT_PUBLIC_API_URL para datos reales.',
      },
    ],
    lastUpdated: new Date().toISOString(),
    tenant_budgets: [
      {
        tenant_slug: 'smiletripcare',
        tenant_name: 'SmileTripCare',
        current_spend_usd: 0,
        limit_usd: 25,
        percent_used: 0,
        alert_level: 'ok',
        enforcement_skipped: true,
        projected_month_end_usd: 0,
      },
    ],
    llm_budget_summary: {
      tenant_count: 1,
      tenants_at_warning: 0,
      tenants_at_critical: 0,
      total_spend_usd: 0,
    },
  };
}

export async function getTenants(params: ListTenantsParams = {}): Promise<TenantsListResponse> {
  if (shouldUseLocalDemoData()) {
    return demoTenants();
  }
  const search = new URLSearchParams();
  search.set('page', String(params.page ?? 1));
  search.set('limit', String(params.limit ?? 20));
  if (params.status) {
    search.set('status', params.status);
  }
  if (params.plan) {
    search.set('plan', params.plan);
  }
  try {
    return await request<TenantsListResponse>(`/api/tenants?${search.toString()}`);
  } catch {
    return demoTenants();
  }
}

export async function getTenant(idOrSlug: string): Promise<TenantDetailResponse> {
  return request<TenantDetailResponse>(`/api/tenants/${idOrSlug}`);
}

export type CreateTenantBody = {
  slug: string;
  owner_email: string;
  plan: 'startup' | 'business' | 'enterprise' | 'demo';
  stripe_customer_id?: string;
};

export async function createTenant(
  data: CreateTenantBody
): Promise<{ id: string; slug: string; status: string }> {
  return request(`/api/tenants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export type UpdateTenantBody = {
  name?: string;
  plan?: 'startup' | 'business' | 'enterprise' | 'demo';
};

export async function updateTenant(id: string, data: UpdateTenantBody): Promise<Tenant> {
  return request(`/api/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTenant(id: string): Promise<void> {
  await request<undefined>(`/api/tenants/${id}`, { method: 'DELETE' });
}

export async function suspendTenant(id: string): Promise<{ status: string }> {
  return request(`/api/tenants/${id}/suspend`, { method: 'POST' });
}

export async function resumeTenant(id: string): Promise<{ status: string }> {
  return request(`/api/tenants/${id}/resume`, { method: 'POST' });
}

export async function getMetrics(): Promise<MetricsResponse> {
  return request<MetricsResponse>('/api/metrics');
}

export async function getSystemMetrics(): Promise<SystemMetricsResponse> {
  if (shouldUseLocalDemoData()) {
    return demoSystemMetrics();
  }
  try {
    return await request<SystemMetricsResponse>('/api/metrics/system');
  } catch {
    return demoSystemMetrics();
  }
}

export async function getTeamMetrics(): Promise<TeamMetricsResponse> {
  return request<TeamMetricsResponse>('/api/metrics/teams');
}

export async function getAgentsTeam(): Promise<AgentsTeamResponse> {
  return request<AgentsTeamResponse>('/api/agents/team');
}

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  if (shouldUseLocalDemoData()) {
    return demoAdminOverview();
  }
  try {
    return await request<AdminOverviewResponse>('/api/admin/overview');
  } catch {
    return demoAdminOverview();
  }
}

export async function getDockerContainers(): Promise<AdminDockerContainersResponse> {
  return request<AdminDockerContainersResponse>('/api/admin/docker/containers');
}

export async function getTenantUsageMetrics(
  slug: string,
  period: 'today' | 'month' = 'today'
): Promise<TenantUsageMetricsResponse> {
  const search = new URLSearchParams();
  search.set('period', period);
  return request<TenantUsageMetricsResponse>(
    `/api/metrics/tenant/${encodeURIComponent(slug)}?${search.toString()}`
  );
}

export type SendInvitationBody = {
  email: string;
  tenantRef: string;
  mode?: 'developer' | 'managed';
  name?: string;
};

export async function sendInvitation(data: SendInvitationBody): Promise<InvitationSendResponse> {
  return request<InvitationSendResponse>('/api/invitations', {
    method: 'POST',
    body: JSON.stringify({
      email: data.email,
      tenantRef: data.tenantRef,
      mode: data.mode ?? 'developer',
      ...(data.name !== undefined && data.name.length > 0 ? { name: data.name } : {}),
    }),
  });
}

export type FeedbackDecisionRow = {
  id?: string;
  decision_type?: string;
  criticality?: string;
  reasoning?: string;
  implemented_at?: string | null;
  created_at?: string;
};

export type FeedbackConversationRow = {
  id: string;
  tenant_slug: string;
  user_email: string;
  status: string;
  created_at: string;
  feedback_decisions?: FeedbackDecisionRow[] | null;
};

export type ListFeedbackResponse = {
  feedbacks: FeedbackConversationRow[];
};

export async function listFeedback(params: {
  status?: string;
  limit?: number;
}): Promise<ListFeedbackResponse> {
  const search = new URLSearchParams();
  search.set('limit', String(params.limit ?? 50));
  if (params.status) {
    search.set('status', params.status);
  }
  return request<ListFeedbackResponse>(`/api/feedback?${search.toString()}`);
}

export async function approveFeedbackDecision(body: {
  decision_id: string;
  approved: boolean;
}): Promise<{ success: boolean; approved: boolean }> {
  return request(`/api/feedback/approve`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getAdminCosts(): Promise<AdminCostsResponse> {
  if (shouldUseLocalDemoData()) {
    return demoAdminCosts();
  }
  try {
    return await request<AdminCostsResponse>('/api/admin/costs');
  } catch {
    return demoAdminCosts();
  }
}

export async function postCostDecision(body: {
  service_id: string;
  action: 'approve' | 'reject';
  reason?: string;
}): Promise<CostDecisionResponse> {
  return request<CostDecisionResponse>('/api/admin/costs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type Mac2011MonitoringResult =
  | { ok: true; data: Mac2011MonitoringStatus; status: number }
  | { ok: false; status: number; body: unknown };

export async function getMac2011Monitoring(): Promise<Mac2011MonitoringResult> {
  const headers = await buildHeaders(undefined);
  const res = await fetch(`${getBaseUrl()}/api/monitoring/mac2011`, {
    headers,
  });
  const body: unknown = await parseJson(res);
  if (res.ok && body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return {
      ok: true,
      data: body as Mac2011MonitoringStatus,
      status: res.status,
    };
  }
  return { ok: false, status: res.status, body };
}

export type PostOllamaDemoBody = {
  tenant_slug: string;
  prompt: string;
  task_type: 'analyze' | 'generate' | 'review' | 'summarize';
};

export type PostOllamaDemoResponse = {
  ok?: boolean;
  job_id?: string | null;
  request_id?: string;
};

export async function postOllamaDemo(body: PostOllamaDemoBody): Promise<PostOllamaDemoResponse> {
  return request<PostOllamaDemoResponse>('/api/admin/ollama-demo', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getOllamaDemoJob(jobId: string): Promise<OllamaDemoJobStatus> {
  return request<OllamaDemoJobStatus>(`/api/admin/ollama-demo?job_id=${encodeURIComponent(jobId)}`);
}

export type { OllamaDemoJobStatus } from './types';
