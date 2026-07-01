import { CACHE_TTL } from './constants';
import { logger } from './logger';
import { getCache, setCache } from './redis-cache';
import { getServiceClient } from './supabase';

const CACHE_KEY = 'platform:active_tenants_count';

/**
 * Counts active, non-deleted tenants from the platform registry.
 *
 * Bolt Optimization:
 * 1. Caches result in Redis for 60s (CACHE_TTL.SHORT) to minimize Supabase query overhead.
 * 2. Uses non-blocking background cache sets to avoid blocking the current request's conclusion.
 */
export async function fetchActiveTenantCount(): Promise<number> {
  const cached = await getCache<number>(CACHE_KEY);
  if (cached !== null) {
    return cached;
  }

  const { count, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'active');

  if (error) {
    logger.error('tenant-counts:fetchActiveTenantCount', error);
    return 0;
  }

  const result = count ?? 0;
  void setCache(CACHE_KEY, result, CACHE_TTL.SHORT);

  return result;
}
