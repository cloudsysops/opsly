import type { createClient } from "redis";
import { getMeteringRedis } from "../billing/redis-metering";

type RedisClient = ReturnType<typeof createClient>;

const HEARTBEAT_TTL_SECONDS = 60;
const REDIS_TIMEOUT_MS = 1500;
/** Redis TTL value returned when key does not exist. */
const REDIS_TTL_KEY_NOT_FOUND = -2;

export type HeartbeatStatus = "healthy" | "degraded" | "down";

export type HeartbeatPayload = {
  readonly ts: number;
  readonly metadata: Record<string, unknown>;
};

export type ServiceHeartbeatStatus = {
  readonly name: string;
  readonly status: HeartbeatStatus;
  readonly lastSeenSeconds: number | null;
  readonly ttlSeconds: number | null;
  readonly metadata: Record<string, unknown>;
};

export function heartbeatKey(serviceName: string): string {
  return `heartbeat:${serviceName}`;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`redis timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      timeout.unref?.();
    }),
  ]);
}

export async function recordHeartbeat(
  serviceName: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const redis = await getMeteringRedis();
  if (!redis) {
    return;
  }
  const payload: HeartbeatPayload = { ts: Date.now(), metadata };
  await redis.set(
    heartbeatKey(serviceName),
    JSON.stringify(payload),
    { EX: HEARTBEAT_TTL_SECONDS },
  );
}

export async function requireHeartbeatRedis(): Promise<RedisClient> {
  const redis = await withTimeout(getMeteringRedis(), REDIS_TIMEOUT_MS);
  if (!redis) {
    throw new Error("redis unavailable");
  }
  return redis;
}

function parseHeartbeatPayload(raw: string | null): HeartbeatPayload | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const tsRaw = parsed.ts;
    const metadataRaw = parsed.metadata;
    const ts = typeof tsRaw === "number" ? tsRaw : Number.NaN;
    if (!Number.isFinite(ts)) {
      return null;
    }
    const metadata =
      typeof metadataRaw === "object" &&
      metadataRaw !== null &&
      !Array.isArray(metadataRaw)
        ? (metadataRaw as Record<string, unknown>)
        : {};
    return { ts, metadata };
  } catch {
    return null;
  }
}

const STALE_THRESHOLD_S = 60;
const HEALTHY_TTL_S = 30;

function buildResult(
  name: string,
  status: HeartbeatStatus,
  lastSeenSeconds: number | null,
  ttlSeconds: number | null,
  metadata: Record<string, unknown>,
): ServiceHeartbeatStatus {
  return { name, status, lastSeenSeconds, ttlSeconds, metadata };
}

function resolveStatus(
  ttlSeconds: number | null,
  lastSeenSeconds: number | null,
  missing: boolean,
): HeartbeatStatus {
  if (missing || (lastSeenSeconds !== null && lastSeenSeconds > STALE_THRESHOLD_S)) {
    return "down";
  }
  if (
    (ttlSeconds !== null && ttlSeconds > HEALTHY_TTL_S) ||
    (lastSeenSeconds !== null && lastSeenSeconds < HEALTHY_TTL_S)
  ) {
    return "healthy";
  }
  return "degraded";
}

export function classifyHeartbeat(
  name: string,
  raw: string | null,
  ttlSeconds: number | null,
  nowMs: number,
): ServiceHeartbeatStatus {
  const payload = parseHeartbeatPayload(raw);
  const lastSeenSeconds =
    payload && payload.ts > 0
      ? Math.max(0, Math.floor((nowMs - payload.ts) / 1000))
      : null;

  const missing = ttlSeconds === null || ttlSeconds === REDIS_TTL_KEY_NOT_FOUND || !payload;
  const status = resolveStatus(ttlSeconds, lastSeenSeconds, missing);
  return buildResult(name, status, lastSeenSeconds, ttlSeconds, payload?.metadata ?? {});
}
