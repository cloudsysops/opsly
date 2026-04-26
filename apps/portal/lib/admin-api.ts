import { getApiBaseUrl } from './api';

function resolveBase(override?: string): string {
  if (override && override.length > 0) {
    return override.replace(/\/$/, '');
  }
  return getApiBaseUrl();
}

export type SuperAdminMetricsPayload = {
  active_tenants: number;
  gross_revenue_month_usd: number;
  revenue_last_months: Array<{ month: string; amount: number }>;
  bullmq_pipeline_jobs: number;
  bullmq: {
    openclaw_total: number;
    teams_total: number;
    all_queues_total: number;
    redis_available: boolean;
  };
};

export type SuperAdminTenantRow = {
  id: string;
  slug: string;
  name: string;
  owner_email: string;
  plan: string;
  status: string;
  spend_month_usd: number;
};

export type SuperAdminTenantsPayload = {
  limit: number;
  offset: number;
  total: number;
  tenants: SuperAdminTenantRow[];
};

export async function fetchSuperAdminMetrics(
  accessToken: string,
  baseUrl?: string
): Promise<SuperAdminMetricsPayload> {
  const base = resolveBase(baseUrl);
  const res = await fetch(`${base}/api/admin/metrics`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === 'object' && err !== null && 'error' in err
        ? String((err as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || 'Failed to load admin metrics');
  }
  return res.json() as Promise<SuperAdminMetricsPayload>;
}

export async function fetchSuperAdminTenants(
  accessToken: string,
  limit: number,
  offset: number,
  baseUrl?: string
): Promise<SuperAdminTenantsPayload> {
  const base = resolveBase(baseUrl);
  const q = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${base}/api/admin/tenants?${q.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof err === 'object' && err !== null && 'error' in err
        ? String((err as { error: unknown }).error)
        : res.statusText;
    throw new Error(msg || 'Failed to load tenants');
  }
  return res.json() as Promise<SuperAdminTenantsPayload>;
}
