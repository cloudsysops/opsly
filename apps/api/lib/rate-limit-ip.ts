import { createClient } from 'redis';
import type { NextRequest } from 'next/server';

export const IP_RATE_LIMIT_WINDOW_SECONDS = 60;
export const IP_RATE_LIMIT_MAX_REQUESTS = 30;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

type RedisClient = ReturnType<typeof createClient>;

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

function redisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/**
 * Extrae IP real del request priorizando cf-connecting-ip para mitigar spoofing.
 */
export function extractClientIp(request: Request | NextRequest): string {
  // 1. Priorizar cabecera de Cloudflare (verificada por el proxy si está bien configurado)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // 2. x-forwarded-for (tomar la primera entrada)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  // 3. x-real-ip
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

async function getRedis(): Promise<RedisClient | null> {
  const url = redisUrl();
  if (!url) return null;

  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = (async (): Promise<RedisClient | null> => {
      try {
        const nextClient = createClient({ url });
        nextClient.on('error', () => {});
        await nextClient.connect();
        client = nextClient as RedisClient;
        return client;
      } catch {
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }
  return connectPromise;
}

export async function checkIpRateLimit(
  request: Request | NextRequest,
  prefix = 'ratelimit:ip'
): Promise<RateLimitResult> {
  const ip = extractClientIp(request);
  const key = `${prefix}:${ip}`;
  const nowMs = Date.now();

  const redis = await getRedis();
  if (!redis) {
    // Si Redis no está disponible, fallamos a favor de permitir pero logueamos
    console.warn('[rate-limit-ip] Redis unavailable, allowing request');
    return {
      allowed: true,
      remaining: IP_RATE_LIMIT_MAX_REQUESTS,
      resetAt: new Date(nowMs + IP_RATE_LIMIT_WINDOW_SECONDS * 1000),
    };
  }

  try {
    const reply = (await redis.sendCommand([
      'EVAL',
      RATE_LIMIT_LUA_SCRIPT,
      '1',
      key,
      String(IP_RATE_LIMIT_WINDOW_SECONDS),
    ])) as [number, number];

    const [count, ttlSeconds] = reply;
    return {
      allowed: count <= IP_RATE_LIMIT_MAX_REQUESTS,
      remaining: Math.max(0, IP_RATE_LIMIT_MAX_REQUESTS - count),
      resetAt: new Date(
        nowMs + (ttlSeconds > 0 ? ttlSeconds : IP_RATE_LIMIT_WINDOW_SECONDS) * 1000
      ),
    };
  } catch (error) {
    console.error('[rate-limit-ip] failed', error);
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(nowMs + IP_RATE_LIMIT_WINDOW_SECONDS * 1000),
    };
  }
}
