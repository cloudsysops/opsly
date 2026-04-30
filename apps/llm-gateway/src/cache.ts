import { createClient } from 'redis';
import { NamespacedRedis, buildTenantKey } from './lib/redis-namespace-helper.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TTL_SECONDS = Number.parseInt(process.env.LLM_CACHE_TTL_SECONDS ?? '7200', 10) || 7200;
const LLM_GATEWAY_TENANT_AWARE = process.env.LLM_GATEWAY_TENANT_AWARE === 'true';
const LLM_GATEWAY_REDIS_NAMESPACE = process.env.LLM_GATEWAY_REDIS_NAMESPACE || 'llm';

let client: ReturnType<typeof createClient> | null = null;

/**
 * Obtener NamespacedRedis para un tenant específico.
 */
async function getNamespacedRedis(tenantSlug: string): Promise<NamespacedRedis> {
  const redis = await getClient();
  return new NamespacedRedis(redis, tenantSlug, LLM_GATEWAY_REDIS_NAMESPACE);
}

async function getClient() {
  if (!client) {
    client = createClient({
      url: REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });
    await client.connect();
  }
  return client;
}

/** Misma conexión Redis que cache LLM (MCP OAuth codes, etc.). */
export async function getRedisClient() {
  return getClient();
}

export async function closeRedisClient(): Promise<void> {
  if (!client) {
    return;
  }
  try {
    if (client.isOpen) {
      await client.quit();
    }
  } finally {
    client = null;
  }
}

export async function cacheGet(tenantSlug: string, promptHash: string): Promise<string | null> {
  if (!LLM_GATEWAY_TENANT_AWARE) {
    // Legacy: direct redis access
    const redis = await getClient();
    const key = buildTenantKey(tenantSlug, LLM_GATEWAY_REDIS_NAMESPACE, `cache:${promptHash}`);
    return redis.get(key);
  }

  // Tenant-aware: usar NamespacedRedis
  const ns = await getNamespacedRedis(tenantSlug);
  return ns.get(`cache:${promptHash}`);
}

export async function cacheSet(
  tenantSlug: string,
  promptHash: string,
  response: string
): Promise<void> {
  if (!LLM_GATEWAY_TENANT_AWARE) {
    // Legacy: direct redis access
    const redis = await getClient();
    const key = buildTenantKey(tenantSlug, LLM_GATEWAY_REDIS_NAMESPACE, `cache:${promptHash}`);
    await redis.setEx(key, TTL_SECONDS, response);
    return;
  }

  // Tenant-aware: usar NamespacedRedis
  const ns = await getNamespacedRedis(tenantSlug);
  await ns.setEx(`cache:${promptHash}`, TTL_SECONDS, response);
}

export async function getCacheStats(tenantSlug: string): Promise<{ keys: number }> {
  if (!LLM_GATEWAY_TENANT_AWARE) {
    // Legacy: direct redis access
    const redis = await getClient();
    const pattern = buildTenantKey(tenantSlug, LLM_GATEWAY_REDIS_NAMESPACE, 'cache:*');
    const keys = await redis.keys(pattern);
    return { keys: keys.length };
  }

  // Tenant-aware: usar NamespacedRedis
  const ns = await getNamespacedRedis(tenantSlug);
  const keys = await ns.keys('cache:*');
  return { keys: keys.length };
}
