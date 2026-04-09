import { getApiBaseUrl } from "./api";
import { requestPortalApi } from "./http";
import {
  portalTenantMeUrl,
  portalTenantModeUrl,
  portalTenantUsageUrl,
} from "./portal-api-paths";
import type {
  PortalMode,
  PortalTenantPayload,
  PortalUsagePayload,
  PortalUsagePeriod,
} from "./types";

/**
 * Lee `tenant_slug` del JWT de Supabase cuando está presente (invitaciones / portal).
 */
export function tenantSlugFromUserMetadata(
  user: { user_metadata?: unknown } | null | undefined,
): string | undefined {
  if (
    !user?.user_metadata ||
    typeof user.user_metadata !== "object" ||
    Array.isArray(user.user_metadata)
  ) {
    return undefined;
  }
  const ts = (user.user_metadata as Record<string, unknown>).tenant_slug;
  if (typeof ts !== "string") {
    return undefined;
  }
  const trimmed = ts.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Payload del tenant portal. Con `tenantSlug` llama a
 * `GET /api/portal/tenant/[slug]/me` (validación `tenantSlugMatchesSession` en API);
 * sin slug usa `GET /api/portal/me` (mismo JWT).
 */
export async function fetchPortalTenant(
  accessToken: string,
  tenantSlug?: string,
): Promise<PortalTenantPayload> {
  const path = portalTenantMeUrl(getApiBaseUrl(), tenantSlug);
  return requestPortalApi<PortalTenantPayload>(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

/**
 * Persiste el modo del portal. Con `tenantSlug` llama a
 * `POST /api/portal/tenant/[slug]/mode` (validación `tenantSlugMatchesSession` en API);
 * sin slug usa `POST /api/portal/mode` (mismo JWT).
 */
export async function postPortalMode(
  accessToken: string,
  mode: PortalMode,
  tenantSlug?: string,
): Promise<void> {
  const path = portalTenantModeUrl(getApiBaseUrl(), tenantSlug);
  await requestPortalApi(path, {
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
  const path = portalTenantUsageUrl(getApiBaseUrl(), period, tenantSlug);
  return requestPortalApi<PortalUsagePayload>(path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}
