import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;
type RateLimitReply = {
  count: number;
  ttlSeconds: number;
};

export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_REPLY_LENGTH = 2;

const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('TTL', KEYS[1])
return { current, ttl }
`;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;
let hasLoggedMissingRedisUrl = false;
const memoryBuckets = new Map<string, { count: number; resetAtMs: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

function redisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : null;
}

function rateLimitKey(tenantSlug: string): string {
  return `ratelimit:${tenantSlug}`;
}

function normalizeTenantSlug(tenantSlug: string): string {
  const slug = tenantSlug.trim();
  if (slug.length === 0) {
    throw new Error('tenantSlug is required');
  }
  return slug;
}

function parseRedisInteger(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Invalid Redis ${field} response`);
}

function parseRateLimitReply(reply: unknown): RateLimitReply {
  if (!Array.isArray(reply) || reply.length !== RATE_LIMIT_REPLY_LENGTH) {
    throw new Error('Invalid Redis rate limit reply');
  }

  return {
    count: parseRedisInteger(reply[0], 'count'),
    ttlSeconds: parseRedisInteger(reply[1], 'ttl'),
  };
}

function fallbackMemoryResult(tenantSlug: string, nowMs: number): RateLimitResult {
  const key = rateLimitKey(tenantSlug);
  const current = memoryBuckets.get(key);

  if (!current || current.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + RATE_LIMIT_WINDOW_SECONDS * 1000;
    memoryBuckets.set(key, { count: 1, resetAtMs });
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: new Date(resetAtMs),
    };
  }

  const nextCount = current.count + 1;
  memoryBuckets.set(key, { count: nextCount, resetAtMs: current.resetAtMs });

  return {
    allowed: nextCount <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - nextCount),
    resetAt: new Date(current.resetAtMs),
  };
}

function resetAtFromTtl(nowMs: number, ttlSeconds: number): Date {
  const safeTtlSeconds = ttlSeconds > 0 ? ttlSeconds : RATE_LIMIT_WINDOW_SECONDS;
  return new Date(nowMs + safeTtlSeconds * 1000);
}

async function getRateLimitRedis(): Promise<RedisClient | null> {
  const url = redisUrl();
  if (!url) {
    if (!hasLoggedMissingRedisUrl) {
      console.error('[rate-limiter] REDIS_URL not set');
      hasLoggedMissingRedisUrl = true;
    }
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (!connectPromise) {
    connectPromise = (async (): Promise<RedisClient | null> => {
      try {
        const nextClient = createClient({ url });
        nextClient.on('error', (error: Error) => {
          console.error('[rate-limiter]', error.message);
        });
        await nextClient.connect();
        client = nextClient;
        return nextClient;
      } catch (error) {
        console.error('[rate-limiter] connect failed', error);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export async function checkRateLimit(tenantSlug: string): Promise<RateLimitResult> {
  const normalizedTenantSlug = normalizeTenantSlug(tenantSlug);
  const nowMs = Date.now();
  const redis = await getRateLimitRedis();
  if (!redis) {
    return fallbackMemoryResult(normalizedTenantSlug, nowMs);
  }

  const key = rateLimitKey(normalizedTenantSlug);

  try {
    const reply = parseRateLimitReply(
      await redis.sendCommand([
        'EVAL',
        RATE_LIMIT_LUA_SCRIPT,
        '1',
        key,
        String(RATE_LIMIT_WINDOW_SECONDS),
      ])
    );

    return {
      allowed: reply.count <= RATE_LIMIT_MAX_REQUESTS,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - reply.count),
      resetAt: resetAtFromTtl(nowMs, reply.ttlSeconds),
    };
  } catch (error) {
    console.error('[rate-limiter] request failed', error);
    return fallbackMemoryResult(normalizedTenantSlug, nowMs);
  }
}

export function resetRateLimiterStateForTests(): void {
  client = null;
  connectPromise = null;
  hasLoggedMissingRedisUrl = false;
  memoryBuckets.clear();
}
