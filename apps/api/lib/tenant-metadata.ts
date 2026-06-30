import { getServiceClient } from './supabase';
import { logger } from './logger';
import type { Json } from './supabase/types';
import { getCache, setCache } from './redis-cache';
import { CACHE_TTL } from './constants';

export async function fetchTenantMetadataBySlug(slug: string): Promise<Json | null> {
  const cacheKey = `tenant:metadata:slug:${slug}`;
  // Using an object wrapper to distinguish between cache miss (null) and cached null metadata
  const cached = await getCache<{ metadata: Json | null }>(cacheKey);
  if (cached !== null) {
    return cached.metadata;
  }

  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .select('metadata')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error !== null) {
    logger.error('tenant_metadata_fetch', { slug, error });
    return null;
  }

  const metadata = data ? (data as { metadata: Json | null }).metadata : null;

  // Cache both found and not found (negative caching) to reduce DB load
  void setCache(cacheKey, { metadata }, CACHE_TTL.SHORT);

  return metadata;
}
