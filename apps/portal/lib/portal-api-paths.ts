import type { PortalUsagePeriod } from "./types";

function normalizeApiBase(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/$/, "");
}

function hasNonEmptyTenantSlug(tenantSlug?: string): tenantSlug is string {
  return tenantSlug !== undefined && tenantSlug.length > 0;
}

/** URL absoluta `GET` perfil portal (`/me` o `/tenant/[slug]/me`). */
export function portalTenantMeUrl(
  apiBaseUrl: string,
  tenantSlug?: string,
): string {
  const base = normalizeApiBase(apiBaseUrl);
  if (hasNonEmptyTenantSlug(tenantSlug)) {
    return `${base}/api/portal/tenant/${encodeURIComponent(tenantSlug)}/me`;
  }
  return `${base}/api/portal/me`;
}

/** URL absoluta `POST` modo (`/mode` o `/tenant/[slug]/mode`). */
export function portalTenantModeUrl(
  apiBaseUrl: string,
  tenantSlug?: string,
): string {
  const base = normalizeApiBase(apiBaseUrl);
  if (hasNonEmptyTenantSlug(tenantSlug)) {
    return `${base}/api/portal/tenant/${encodeURIComponent(tenantSlug)}/mode`;
  }
  return `${base}/api/portal/mode`;
}

/** URL absoluta `GET` uso LLM (`/usage` o `/tenant/[slug]/usage`) con `?period=`. */
export function portalTenantUsageUrl(
  apiBaseUrl: string,
  period: PortalUsagePeriod,
  tenantSlug?: string,
): string {
  const qs = new URLSearchParams({ period }).toString();
  const base = normalizeApiBase(apiBaseUrl);
  if (hasNonEmptyTenantSlug(tenantSlug)) {
    return `${base}/api/portal/tenant/${encodeURIComponent(tenantSlug)}/usage?${qs}`;
  }
  return `${base}/api/portal/usage?${qs}`;
}
