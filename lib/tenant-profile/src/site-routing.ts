import type { TenantSiteRoutingConfig, TenantSiteRule } from '@intcloudsysops/runtime';

import { listTenantProfiles } from './load.js';
import { isProductionRuntime, resolveIncubatedTenantSiteUrl } from './site-url.js';
import type { TenantProfile } from './types.js';

function toSiteRule(profile: TenantProfile, isProduction: boolean): TenantSiteRule | null {
  const incubated = profile.stack_type === 'incubator-app' || Boolean(profile.public_url);
  if (!incubated) {
    return null;
  }
  const siteUrl = resolveIncubatedTenantSiteUrl(profile, isProduction);
  const staffPath = profile.staff_login_path?.trim();
  return {
    tenantSlug: profile.tenant_slug,
    siteUrl,
    loginPath: '/login',
    ...(staffPath ? { staffLoginPath: staffPath } : {}),
  };
}

/** Build tenant site routing rules from config/tenants/*.json (no hardcoded slugs). */
export async function buildTenantSiteRoutingConfig(
  portalSiteUrl: string
): Promise<TenantSiteRoutingConfig> {
  const isProduction = isProductionRuntime();
  const profiles = await listTenantProfiles();
  const tenantRules: TenantSiteRule[] = [];
  for (const profile of profiles) {
    const rule = toSiteRule(profile, isProduction);
    if (rule) {
      tenantRules.push(rule);
    }
  }
  return {
    portal: {
      siteUrl: portalSiteUrl.replace(/\/$/, ''),
      loginPath: '/login',
    },
    tenantRules,
  };
}
