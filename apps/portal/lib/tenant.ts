import { getApiBaseUrl } from "./api";
import { requestPortalApi } from "./http";
import type {
  PortalMode,
  PortalTenantPayload,
  PortalUsagePayload,
  PortalUsagePeriod,
} from "./types";

export async function fetchPortalTenant(
  accessToken: string,
): Promise<PortalTenantPayload> {
  return requestPortalApi<PortalTenantPayload>(`${getApiBaseUrl()}/api/portal/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

export async function postPortalMode(
  accessToken: string,
  mode: PortalMode,
): Promise<void> {
  await requestPortalApi(`${getApiBaseUrl()}/api/portal/mode`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });
}

/**
 * Métricas LLM del tenant. Con `tenantSlug` llama a
 * `GET /api/portal/tenant/[slug]/usage` (validación `tenantSlugMatchesSession` en API);
 * sin slug usa `GET /api/portal/usage` (mismo JWT).
 */
export async function fetchPortalUsage(
  accessToken: string,
  period: PortalUsagePeriod = "today",
  tenantSlug?: string,
): Promise<PortalUsagePayload> {
  const qs = new URLSearchParams({ period });
  const base = getApiBaseUrl();
  const path =
    tenantSlug !== undefined && tenantSlug.length > 0
      ? `${base}/api/portal/tenant/${encodeURIComponent(tenantSlug)}/usage?${qs.toString()}`
      : `${base}/api/portal/usage?${qs.toString()}`;
  return requestPortalApi<PortalUsagePayload>(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}
