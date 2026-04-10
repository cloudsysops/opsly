import { unitCostUsdForMetric } from "./billing-meter-pricing";
import { parseUsageRedisKey } from "./billing/flush-billing-usage";
import { getMeteringRedis } from "./billing/redis-metering";

const ISO_DATE_SLICE = 10;
const CENTS = 100;
const SCAN_COUNT = 100;

/** Evita saturar logs en Vercel / serverless (una advertencia por ventana). */
const BILLING_REDIS_WARN_INTERVAL_MS = 60_000;

let lastBillingRedisWarnAt = 0;

const BILLING_REDIS_STDERR_MSG =
  "[BILLING WARNING] Redis unreachable. Real-time billing disabled. Data may be delayed.";

function warnBillingRedisDegraded(detail: string): void {
  const now = Date.now();
  if (now - lastBillingRedisWarnAt < BILLING_REDIS_WARN_INTERVAL_MS) {
    return;
  }
  lastBillingRedisWarnAt = now;
  console.error(`${BILLING_REDIS_STDERR_MSG} ${detail}`);
}

export type BillingMonthBounds = {
  /** Primer día del mes (YYYY-MM-DD, UTC). */
  readonly periodStart: string;
  /** Último día del mes (YYYY-MM-DD, UTC). */
  readonly periodEnd: string;
  readonly daysInMonth: number;
  /** Días transcurridos del mes (1–31), mínimo 1 para división. */
  readonly daysElapsedForRate: number;
  /** ISO `recorded_at >=` inicio del mes (UTC). */
  readonly recordedAtGteIso: string;
};

/**
 * Límites del mes calendario UTC respecto a `now`.
 */
export function getBillingMonthBoundsUtc(now: Date): BillingMonthBounds {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const lastDayDate = new Date(Date.UTC(y, m + 1, 0));
  const daysInMonth = lastDayDate.getUTCDate();
  const dayOfMonth = now.getUTCDate();
  return {
    periodStart: start.toISOString().slice(0, ISO_DATE_SLICE),
    periodEnd: lastDayDate.toISOString().slice(0, ISO_DATE_SLICE),
    daysInMonth,
    daysElapsedForRate: Math.max(1, dayOfMonth),
    recordedAtGteIso: start.toISOString(),
  };
}

function parseQuantity(raw: string | undefined): number {
  if (raw === undefined || raw === null || raw === "") {
    return 0;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

type RedisInstance = Awaited<ReturnType<typeof getMeteringRedis>>;

async function getKeyUsdContribution(
  redis: NonNullable<RedisInstance>,
  key: string,
  tenantId: string,
): Promise<number> {
  if (typeof key !== "string") return 0;
  const parsed = parseUsageRedisKey(key);
  if (parsed?.tenantId !== tenantId) return 0;
  const raw = await redis.get(key);
  const qty = parseQuantity(raw ?? undefined);
  if (qty <= 0) return 0;
  const unit = unitCostUsdForMetric(parsed.metricType);
  return qty * unit;
}

/**
 * Coste USD pendiente en Redis (`usage:{tenantId}:*`) sin flush.
 * Usa `SCAN` con `MATCH` (no `KEYS *`); métrica y precio vía `parseUsageRedisKey` + `unitCostUsdForMetric`.
 */
export async function sumPendingRedisUsageUsd(tenantId: string): Promise<number> {
  const redisUrlConfigured = Boolean(process.env.REDIS_URL?.trim());
  const redis = await getMeteringRedis();
  if (!redis) {
    warnBillingRedisDegraded(
      redisUrlConfigured
        ? "(connection failed, timeout, or client closed — check REDIS_URL and Redis availability)"
        : "(REDIS_URL not set)",
    );
    return 0;
  }
  const pattern = `usage:${tenantId}:*`;
  let pending = 0;
  try {
    for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: SCAN_COUNT })) {
      pending += await getKeyUsdContribution(redis, key as string, tenantId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warnBillingRedisDegraded(`(scan/get failed: ${msg})`);
    return 0;
  }
  return pending;
}

export function roundUsd2(n: number): number {
  return Math.round(n * CENTS) / CENTS;
}
