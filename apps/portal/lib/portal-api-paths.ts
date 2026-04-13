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

/** URL absoluta `GET/PATCH` insights — `/api/portal/tenant/[slug]/insights`. */
export function portalTenantInsightsUrl(
  apiBaseUrl: string,
  tenantSlug: string,
): string {
  const base = normalizeApiBase(apiBaseUrl);
  return `${base}/api/portal/tenant/${encodeURIComponent(tenantSlug)}/insights`;
}

/** URL absoluta `GET` health con JWT — `/api/portal/tenant/[slug]/health` (Zero-Trust). */
export function portalHealthUrl(apiBaseUrl: string, tenantSlug: string): string {
  const base = normalizeApiBase(apiBaseUrl);
  return `${base}/api/portal/tenant/${encodeURIComponent(tenantSlug)}/health`;
}

/** URL absoluta `GET` health público — `/api/portal/health?slug=` (monitoring, sin JWT). */
export function portalPublicHealthUrl(apiBaseUrl: string, slug: string): string {
  const base = normalizeApiBase(apiBaseUrl);
  return `${base}/api/portal/health?slug=${encodeURIComponent(slug)}`;
}

/** URL absoluta `POST` onboarding de nuevo tenant (`/api/portal/onboarding`). */
export function portalOnboardingUrl(apiBaseUrl: string): string {
  return `${normalizeApiBase(apiBaseUrl)}/api/portal/onboarding`;
}

/** URL absoluta `GET` estado infraestructura (`/api/infra/status`). */
export function infraStatusUrl(apiBaseUrl: string): string {
  const base = normalizeApiBase(apiBaseUrl);
  return `${base}/api/infra/status`;
}
