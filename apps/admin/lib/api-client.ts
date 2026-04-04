import type {
  MetricsResponse,
  Tenant,
  TenantDetailResponse,
  TenantsListResponse,
} from "./types";

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || base.length === 0) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return base.replace(/\/$/, "");
}

function getAdminToken(): string {
  const token = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN;
  if (!token || token.length === 0) {
    throw new Error("NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN is not set");
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

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
      ...init?.headers,
    },
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

export async function getTenant(id: string): Promise<TenantDetailResponse> {
  return request<TenantDetailResponse>(`/api/tenants/${id}`);
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
