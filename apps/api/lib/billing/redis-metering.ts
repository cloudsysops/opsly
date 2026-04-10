import { createClient } from "redis";

import type { BillingMetricType } from "./types";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u && u.length > 0 ? u : null;
}

export async function getMeteringRedis(): Promise<RedisClient | null> {
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
        c.on("error", (err: Error) => {
          console.error("[metering-redis]", err.message);
        });
        await c.connect();
        client = c;
        return c;
      } catch (e) {
        console.error("[metering-redis] connect failed", e);
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }
  return connectPromise;
}

function usageKey(tenantId: string, metric: BillingMetricType): string {
  return `usage:${tenantId}:${metric}`;
}

/**
 * Incrementa contador en Redis. Enteros vs decimales según métrica.
 * Errores: devuelve false (el caller hace fallback).
 */
export async function incrementUsageCounter(
  tenantId: string,
  metric: BillingMetricType,
  delta: number,
): Promise<boolean> {
  if (!Number.isFinite(delta) || delta <= 0) {
    return true;
  }
  const redis = await getMeteringRedis();
  if (!redis) {
    return false;
  }
  const key = usageKey(tenantId, metric);
  try {
    if (metric === "ai_tokens") {
      const n = Math.round(delta);
      if (n <= 0) {
        return true;
      }
      await redis.incrBy(key, n);
    } else {
      await redis.incrByFloat(key, delta);
    }
    return true;
  } catch (e) {
    console.error("[metering-redis] incr failed", e);
    return false;
  }
}
