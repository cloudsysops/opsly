import { slugToEnvPrefix } from './env-slug.js';
import type { TenantProfile } from './types.js';

export function isProductionRuntime(): boolean {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (nodeEnv === 'production') {
    return true;
  }
  const dopplerConfig = process.env.DOPPLER_CONFIG?.trim().toLowerCase();
  return dopplerConfig === 'prd' || dopplerConfig === 'prod' || dopplerConfig === 'production';
}

/** Resolve public site URL for an incubated tenant app (config-driven, no slug branches). */
export function resolveIncubatedTenantSiteUrl(
  profile: TenantProfile,
  isProduction = isProductionRuntime()
): string {
  if (!isProduction && profile.internal_port) {
    return `http://localhost:${profile.internal_port}`;
  }

  if (profile.public_url?.trim()) {
    return profile.public_url.trim().replace(/\/$/, '');
  }

  const prefix = slugToEnvPrefix(profile.tenant_slug);
  const envKeys = [
    `TENANT_${prefix}_SITE_URL`,
    `NEXT_PUBLIC_TENANT_${prefix}_SITE_URL`,
    `NEXT_PUBLIC_${prefix}_SITE_URL`,
    `${prefix}_SITE_URL`,
  ];
  for (const key of envKeys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value.replace(/\/$/, '');
    }
  }

  if (!isProduction && profile.internal_port) {
    return `http://localhost:${profile.internal_port}`;
  }

  return `https://${profile.tenant_slug}.${profile.platform_domain}`;
}
