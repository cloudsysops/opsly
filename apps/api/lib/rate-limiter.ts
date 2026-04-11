import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_MAX_REQUESTS = 100;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;
let hasLoggedMissingRedisUrl = false;

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
    throw new Error("tenantSlug is required");
  }
  return slug;
}

function fallbackAllowedResult(nowMs: number): RateLimitResult {
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS,
    resetAt: new Date(nowMs),
  };
}

function resetAtFromTtl(nowMs: number, ttlSeconds: number): Date {
  const safeTtlSeconds =
    ttlSeconds > 0 ? ttlSeconds : RATE_LIMIT_WINDOW_SECONDS;
  return new Date(nowMs + safeTtlSeconds * 1000);
}

async function getRateLimitRedis(): Promise<RedisClient | null> {
  const url = redisUrl();
  if (!url) {
    if (!hasLoggedMissingRedisUrl) {
      console.error("[rate-limiter] REDIS_URL not set");
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
        nextClient.on("error", (error: Error) => {
          console.error("[rate-limiter]", error.message);
        });
        await nextClient.connect();
        client = nextClient;
        return nextClient;
      } catch (error) {
        console.error("[rate-limiter] connect failed", error);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export async function checkRateLimit(
  tenantSlug: string,
): Promise<RateLimitResult> {
  const normalizedTenantSlug = normalizeTenantSlug(tenantSlug);
  const nowMs = Date.now();
  const redis = await getRateLimitRedis();
  if (!redis) {
    return fallbackAllowedResult(nowMs);
  }

  const key = rateLimitKey(normalizedTenantSlug);

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    const ttlSeconds = await redis.ttl(key);

    return {
      allowed: count <= RATE_LIMIT_MAX_REQUESTS,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - count),
      resetAt: resetAtFromTtl(nowMs, ttlSeconds),
    };
  } catch (error) {
    console.error("[rate-limiter] request failed", error);
    return fallbackAllowedResult(nowMs);
  }
}

export function resetRateLimiterStateForTests(): void {
  client = null;
  connectPromise = null;
  hasLoggedMissingRedisUrl = false;
}
