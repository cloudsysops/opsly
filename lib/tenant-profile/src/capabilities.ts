import { enrichTenantProfile as enrichFromCatalog, resolveTenantCapabilities } from '@intcloudsysops/pattern-catalog';

import type { TenantProfile } from './types.js';

export { resolveTenantCapabilities };

/** Merge config/tenants/*.json with pattern catalog capabilities. */
export function enrichTenantProfile(profile: TenantProfile): TenantProfile {
  const merged = enrichFromCatalog(profile);
  return {
    ...profile,
    pattern_ids: merged.pattern_ids,
    capabilities: merged.capabilities,
    modules: merged.modules,
    harness_patterns: merged.harness_patterns,
  };
}

/** Load profile and apply pattern catalog enrichment. */
export async function loadEnrichedTenantProfile(
  slug: string,
  loader: (s: string) => Promise<TenantProfile | null>
): Promise<TenantProfile | null> {
  const profile = await loader(slug);
  if (!profile) {
    return null;
  }
  return enrichTenantProfile(profile);
}
