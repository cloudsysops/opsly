import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { cacheGet, cacheSet, getCacheStats, getRedisClient, closeRedisClient } from '../src/cache.js';

describe('LLM Gateway - Cache with Namespace', () => {
  const TENANT_1 = 'tenant-alpha';
  const TENANT_2 = 'tenant-beta';
  const PROMPT_HASH_1 = 'hash-001';
  const PROMPT_HASH_2 = 'hash-002';
  const RESPONSE_1 = 'Response for tenant alpha';
  const RESPONSE_2 = 'Response for tenant beta';

  beforeAll(async () => {
    try {
      const redis = await getRedisClient();
      expect(redis).toBeDefined();
      await redis.ping();
    } catch {
      throw new Error(
        'Redis no disponible en REDIS_URL (p. ej. redis://127.0.0.1:6379). Arranca Redis o usa CI con servicio redis.'
      );
    }
  }, 15_000);

  afterAll(async () => {
    await closeRedisClient();
  }, 15_000);

  it('should cache response for a tenant', async () => {
    await cacheSet(TENANT_1, PROMPT_HASH_1, RESPONSE_1);
    const cached = await cacheGet(TENANT_1, PROMPT_HASH_1);

    expect(cached).toBe(RESPONSE_1);
  });

  it('should maintain isolation between tenants', async () => {
    await cacheSet(TENANT_1, PROMPT_HASH_1, RESPONSE_1);
    await cacheSet(TENANT_2, PROMPT_HASH_1, RESPONSE_2);

    const cached1 = await cacheGet(TENANT_1, PROMPT_HASH_1);
    const cached2 = await cacheGet(TENANT_2, PROMPT_HASH_1);

    expect(cached1).toBe(RESPONSE_1);
    expect(cached2).toBe(RESPONSE_2);
    expect(cached1).not.toBe(cached2);
  });

  it('should handle multiple hashes per tenant', async () => {
    await cacheSet(TENANT_1, PROMPT_HASH_1, RESPONSE_1);
    await cacheSet(TENANT_1, PROMPT_HASH_2, 'Response for hash 2');

    const cached1 = await cacheGet(TENANT_1, PROMPT_HASH_1);
    const cached2 = await cacheGet(TENANT_1, PROMPT_HASH_2);

    expect(cached1).toBe(RESPONSE_1);
    expect(cached2).toBe('Response for hash 2');
  });

  it('should return null for non-existent cache entries', async () => {
    const cached = await cacheGet(TENANT_1, 'non-existent-hash');
    expect(cached).toBeNull();
  });

  it('should report correct cache statistics per tenant', async () => {
    await cacheSet(TENANT_1, 'hash-1', 'response-1');
    await cacheSet(TENANT_1, 'hash-2', 'response-2');
    await cacheSet(TENANT_1, 'hash-3', 'response-3');

    const stats = await getCacheStats(TENANT_1);
    expect(stats.keys).toBeGreaterThanOrEqual(3);
  });

  it('should isolate cache stats between tenants', async () => {
    const tenant3 = 'tenant-gamma';
    await cacheSet(tenant3, 'hash-a', 'response-a');
    await cacheSet(tenant3, 'hash-b', 'response-b');

    const stats = await getCacheStats(tenant3);
    expect(stats.keys).toBeGreaterThanOrEqual(2);
  });
});
