import { createClient } from 'redis';
import { REDIS_CTX_PREFIX } from './constants.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client: ReturnType<typeof createClient> | null = null;

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

export async function getCachedContext(digestHex: string): Promise<string | null> {
  try {
    const redis = await getRedis();
    return redis.get(`${REDIS_CTX_PREFIX}${digestHex}`);
  } catch {
    return null;
  }
}

export async function setCachedContext(
  digestHex: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.setEx(`${REDIS_CTX_PREFIX}${digestHex}`, ttlSeconds, value);
  } catch {
    /* no bloquear si Redis falla */
  }
}
