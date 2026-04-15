import { getSessionAuthToken } from "./session-auth";
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
} from "./types";

function inferApiBaseFromAdminHost(hostname: string): string | null {
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:3000";
  }
  if (hostname.startsWith("admin.")) {
    return `https://api.${hostname.slice("admin.".length)}`;
  }
  return null;
}

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  if (globalThis.window !== undefined) {
    const inferred = inferApiBaseFromAdminHost(
      globalThis.window.location.hostname,
    );
    if (inferred !== null) {
      return inferred;
    }
  }
  return "http://127.0.0.1:3000";
}

export { getBaseUrl };

async function buildHeaders(initHeaders: HeadersInit | undefined): Promise<Headers> {
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");
  const authToken = await getSessionAuthToken();
  if (authToken !== null && authToken.length > 0) {
    headers.set("Authorization", `Bearer ${authToken}`);
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
    throw new Error("Invalid JSON response");
  }
}

function getErrorMessage(data: unknown): string {
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return "Request failed";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await buildHeaders(init?.headers);

  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
  });

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

export async function getTenants(
  params: ListTenantsParams = {},
): Promise<TenantsListResponse> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 20));
  if (params.status) {
    search.set("status", params.status);
  }
  if (params.plan) {
    search.set("plan", params.plan);
  }
  return request<TenantsListResponse>(`/api/tenants?${search.toString()}`);
}

export async function getTenant(
  idOrSlug: string,
): Promise<TenantDetailResponse> {
  return request<TenantDetailResponse>(`/api/tenants/${idOrSlug}`);
}

export type CreateTenantBody = {
  slug: string;
  owner_email: string;
  plan: "startup" | "business" | "enterprise" | "demo";
  stripe_customer_id?: string;
};

export async function createTenant(
  data: CreateTenantBody,
): Promise<{ id: string; slug: string; status: string }> {
  return request(`/api/tenants`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type UpdateTenantBody = {
  name?: string;
  plan?: "startup" | "business" | "enterprise" | "demo";
};

export async function updateTenant(
  id: string,
  data: UpdateTenantBody,
): Promise<Tenant> {
  return request(`/api/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteTenant(id: string): Promise<void> {
  await request<undefined>(`/api/tenants/${id}`, { method: "DELETE" });
}

export async function suspendTenant(id: string): Promise<{ status: string }> {
  return request(`/api/tenants/${id}/suspend`, { method: "POST" });
}

export async function resumeTenant(id: string): Promise<{ status: string }> {
  return request(`/api/tenants/${id}/resume`, { method: "POST" });
}

export async function getMetrics(): Promise<MetricsResponse> {
  return request<MetricsResponse>("/api/metrics");
}

export async function getSystemMetrics(): Promise<SystemMetricsResponse> {
  return request<SystemMetricsResponse>("/api/metrics/system");
}

export async function getTeamMetrics(): Promise<TeamMetricsResponse> {
  return request<TeamMetricsResponse>("/api/metrics/teams");
}

export async function getAgentsTeam(): Promise<AgentsTeamResponse> {
  return request<AgentsTeamResponse>('/api/agents/team');
}

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  return request<AdminOverviewResponse>("/api/admin/overview");
}

export async function getDockerContainers(): Promise<AdminDockerContainersResponse> {
  return request<AdminDockerContainersResponse>("/api/admin/docker/containers");
}

export async function getTenantUsageMetrics(
  slug: string,
  period: "today" | "month" = "today",
): Promise<TenantUsageMetricsResponse> {
  const search = new URLSearchParams();
  search.set("period", period);
  return request<TenantUsageMetricsResponse>(
    `/api/metrics/tenant/${encodeURIComponent(slug)}?${search.toString()}`,
  );
}

export type SendInvitationBody = {
  email: string;
  tenantRef: string;
  mode?: "developer" | "managed";
  name?: string;
};

export async function sendInvitation(
  data: SendInvitationBody,
): Promise<InvitationSendResponse> {
  return request<InvitationSendResponse>("/api/invitations", {
    method: "POST",
    body: JSON.stringify({
      email: data.email,
      tenantRef: data.tenantRef,
      mode: data.mode ?? "developer",
      ...(data.name !== undefined && data.name.length > 0
        ? { name: data.name }
        : {}),
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
  search.set("limit", String(params.limit ?? 50));
  if (params.status) {
    search.set("status", params.status);
  }
  return request<ListFeedbackResponse>(`/api/feedback?${search.toString()}`);
}

export async function approveFeedbackDecision(body: {
  decision_id: string;
  approved: boolean;
}): Promise<{ success: boolean; approved: boolean }> {
  return request(`/api/feedback/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getAdminCosts(): Promise<AdminCostsResponse> {
  return request<AdminCostsResponse>("/api/admin/costs");
}

export async function postCostDecision(body: {
  service_id: string;
  action: "approve" | "reject";
  reason?: string;
}): Promise<CostDecisionResponse> {
  return request<CostDecisionResponse>("/api/admin/costs", {
    method: "POST",
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
  if (res.ok && body !== null && typeof body === "object" && !Array.isArray(body)) {
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
  task_type: "analyze" | "generate" | "review" | "summarize";
};

export type PostOllamaDemoResponse = {
  ok?: boolean;
  job_id?: string | null;
  request_id?: string;
};

export async function postOllamaDemo(
  body: PostOllamaDemoBody,
): Promise<PostOllamaDemoResponse> {
  return request<PostOllamaDemoResponse>("/api/admin/ollama-demo", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getOllamaDemoJob(
  jobId: string,
): Promise<OllamaDemoJobStatus> {
  return request<OllamaDemoJobStatus>(
    `/api/admin/ollama-demo?job_id=${encodeURIComponent(jobId)}`,
  );
}

export type { OllamaDemoJobStatus } from "./types";
