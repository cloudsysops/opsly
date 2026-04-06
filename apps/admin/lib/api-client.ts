import type {
  InvitationSendResponse,
  MetricsResponse,
  SystemMetricsResponse,
  Tenant,
  TenantDetailResponse,
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
  if (typeof window !== "undefined") {
    const inferred = inferApiBaseFromAdminHost(window.location.hostname);
    if (inferred !== null) {
      return inferred;
    }
  }
  throw new Error("NEXT_PUBLIC_API_URL is not set");
}

function getAdminToken(): string | undefined {
  if (process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO === "true") {
    return undefined;
  }
  const token = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN;
  if (!token || token.length === 0) {
    return undefined;
  }
  return token;
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
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = getAdminToken();
  if (token !== undefined) {
    headers.set("Authorization", `Bearer ${token}`);
  }

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
