import { createClient } from 'redis';
import { createHash } from 'node:crypto';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_SEARCH_PREFIX = 'search:';

let client: ReturnType<typeof createClient> | null = null;

/**
 * Metrics for cache hit rate tracking.
 */
let cacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
};

async function getRedis(): Promise<ReturnType<typeof createClient>> {
  if (!client) {
    client = createClient({
      url: REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });
    await client.connect();
  }
  return client;
}

/**
 * Generate deterministic hash of search query for cache keying.
 * Uses SHA256 to avoid collisions with special characters.
 */
function hashQuery(query: string, options?: Record<string, unknown>): string {
  const key = JSON.stringify({ query, options: options || {} });
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Determine TTL based on query type.
 * Static queries (no special parameters): 24h
 * Dynamic queries (with filters/params): 1h
 */
function determineTtl(
  isDynamic: boolean = false
): number {
  return isDynamic ? 3600 : 86400; // 1h vs 24h
}

/**
 * Get cached search results from Redis.
 * Expected savings: 8-12% (cache hit rate 40-60% on static queries).
 */
export async function getCachedSearchResult(
  query: string,
  options?: Record<string, unknown>
): Promise<string | null> {
  try {
    const redis = await getRedis();
    const hash = hashQuery(query, options);
    const key = `${REDIS_SEARCH_PREFIX}${hash}`;
    const cached = await redis.get(key);

    if (cached) {
      cacheMetrics.hits++;
    } else {
      cacheMetrics.misses++;
    }

    return cached;
  } catch (error) {
    console.warn('[context-builder] search cache get failed', error);
    cacheMetrics.misses++;
    return null;
  }
}

/**
 * Cache search results in Redis with TTL.
 * Determines TTL based on whether query is dynamic (has options).
 */
export async function setCachedSearchResult(
  query: string,
  result: string,
  options?: Record<string, unknown>
): Promise<void> {
  try {
    const redis = await getRedis();
    const hash = hashQuery(query, options);
    const key = `${REDIS_SEARCH_PREFIX}${hash}`;
    const isDynamic = options && Object.keys(options).length > 0;
    const ttl = determineTtl(isDynamic);

    await redis.setEx(key, ttl, result);
    cacheMetrics.sets++;
  } catch (error) {
    console.warn('[context-builder] search cache set failed', error);
    /* no bloquear si Redis falla */
  }
}

/**
 * Get cache hit rate statistics.
 * Returns: { hitRate: 0-1, hits: number, misses: number, total: number }
 */
export function getSearchCacheStats(): {
  hitRate: number;
  hits: number;
  misses: number;
  total: number;
} {
  const total = cacheMetrics.hits + cacheMetrics.misses;
  return {
    hitRate: total > 0 ? cacheMetrics.hits / total : 0,
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    total,
  };
}

/**
 * Reset cache metrics (e.g., on server restart or for testing).
 */
export function resetSearchCacheMetrics(): void {
  cacheMetrics = { hits: 0, misses: 0, sets: 0 };
}

/**
 * Close Redis connection (for graceful shutdown).
 */
export async function closeSearchCache(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}
