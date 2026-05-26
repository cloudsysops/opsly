import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u && u.length > 0 ? u : null;
}

export async function getRedisClient(): Promise<RedisClient | null> {
  const url = redisUrl();
  if (!url) {
    return null;
  }
  if (client?.isOpen) {
    return client;
  }
  if (!connectPromise) {
    connectPromise = (async (): Promise<RedisClient | null> => {
      try {
        const c = createClient({ url });
        c.on('error', (err: Error) => {
          console.error('[redis-cache]', err.message);
        });
        await c.connect();
        client = c;
        return c;
      } catch (e) {
        console.error('[redis-cache] connect failed', e);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }
  return connectPromise;
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }
  try {
    const value = await redis.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  } catch (e) {
    console.error(`[redis-cache] get failed for key ${key}`, e);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    return false;
  }
  try {
    await redis.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
    return true;
  } catch (e) {
    console.error(`[redis-cache] set failed for key ${key}`, e);
    return false;
  }
}
