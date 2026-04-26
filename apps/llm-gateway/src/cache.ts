import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const TTL_SECONDS = Number.parseInt(process.env.LLM_CACHE_TTL_SECONDS ?? '7200', 10) || 7200;

let client: ReturnType<typeof createClient> | null = null;

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
  const redis = await getClient();
  const key = `tenant:${tenantSlug}:llm:cache:${promptHash}`;
  return redis.get(key);
}

export async function cacheSet(
  tenantSlug: string,
  promptHash: string,
  response: string
): Promise<void> {
  const redis = await getClient();
  const key = `tenant:${tenantSlug}:llm:cache:${promptHash}`;
  await redis.setEx(key, TTL_SECONDS, response);
}

export async function getCacheStats(tenantSlug: string): Promise<{ keys: number }> {
  const redis = await getClient();
  const pattern = `tenant:${tenantSlug}:llm:cache:*`;
  const keys = await redis.keys(pattern);
  return { keys: keys.length };
}
