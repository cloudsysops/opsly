import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

const REDIS_OP_TIMEOUT_MS = 2000;

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

/**
 * Encapsula una operación de Redis con un timeout para evitar bloquear la API
 * si Redis está lento o no responde (p. ej. en entornos de CI).
 */
async function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<null>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Redis operation timeout')), REDIS_OP_TIMEOUT_MS);
    });

    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } catch (e) {
    console.error('[redis-cache] operation failed or timed out', e);
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }
  const value = await withTimeout(redis.get(key));
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.error(`[redis-cache] JSON parse failed for key ${key}`, e);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  const redis = await getRedisClient();
  if (!redis) {
    return false;
  }
  const result = await withTimeout(
    redis.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    })
  );
  return result !== null;
}
