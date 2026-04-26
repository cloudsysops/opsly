import type { createClient } from 'redis';

import { unitCostUsdForMetric } from '../billing-meter-pricing';
import { BillingUsageRepository } from '../repositories/billing-usage-repository';
import { getServiceClient } from '../supabase';
import type { Json } from '../supabase/types';
import { runWithTenantContext } from '../tenant-context';
import { getMeteringRedis } from './redis-metering';
import type { BillingMetricType } from './types';

type RedisClient = ReturnType<typeof createClient>;

/** Patrón `usage:{tenantUuid}:{metric}` (clave Redis de medición). */
const USAGE_KEY_PATTERN =
  /^usage:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):(cpu_seconds|ai_tokens|storage_gb|worker_seconds)$/i;

const REGEX_TENANT_GROUP = 1;
const REGEX_METRIC_GROUP = 2;

export type FlushBillingUsageResult = {
  readonly keysScanned: number;
  readonly rowsInserted: number;
  readonly keysSkipped: number;
  readonly keysDeleted: number;
  readonly errors: readonly string[];
};

export function parseUsageRedisKey(
  key: string
): { tenantId: string; metricType: BillingMetricType } | null {
  const m = key.match(USAGE_KEY_PATTERN);
  if (!m) {
    return null;
  }
  return {
    tenantId: m[REGEX_TENANT_GROUP],
    metricType: m[REGEX_METRIC_GROUP] as BillingMetricType,
  };
}

async function resolveTenantSlug(tenantId: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    return null;
  }
  if (!data || typeof data.slug !== 'string' || data.slug.length === 0) {
    return null;
  }
  return data.slug;
}

function parseQuantity(raw: string | undefined): number {
  if (raw === undefined || raw === null || raw === '') {
    return 0;
  }
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

type FlushOneOutcome = 'skipped' | 'inserted_deleted' | 'inserted_redis_del_failed';

interface InsertCtx {
  key: string;
  tenantId: string;
  tenantSlug: string;
  metricType: BillingMetricType;
  quantity: number;
}

async function persistAndDelete(
  redis: RedisClient,
  ctx: InsertCtx,
  errors: string[]
): Promise<'inserted_deleted' | 'inserted_redis_del_failed' | 'skipped'> {
  const unitCost = unitCostUsdForMetric(ctx.metricType);
  const metadata: Json = {
    source: 'billing_flush_worker',
    redis_key: ctx.key,
    flushed_at: new Date().toISOString(),
  };
  try {
    await runWithTenantContext({ tenantId: ctx.tenantId, tenantSlug: ctx.tenantSlug }, async () => {
      const repo = new BillingUsageRepository();
      const { error } = await repo.insertMeteredUsage({
        metricType: ctx.metricType,
        quantity: ctx.quantity,
        unitCostUsd: unitCost,
        metadata,
      });
      if (error) throw error;
    });
  } catch (e) {
    errors.push(
      `insert billing_usage falló para ${ctx.key}: ${e instanceof Error ? e.message : String(e)}`
    );
    return 'skipped';
  }
  try {
    await redis.del(ctx.key);
    return 'inserted_deleted';
  } catch (e) {
    errors.push(
      `Redis DEL falló tras insert OK (${ctx.key}): ${e instanceof Error ? e.message : String(e)}`
    );
    return 'inserted_redis_del_failed';
  }
}

async function flushOneKey(
  redis: RedisClient,
  key: string,
  errors: string[]
): Promise<FlushOneOutcome> {
  const parsed = parseUsageRedisKey(key);
  if (!parsed) return 'skipped';

  const raw = await redis.get(key);
  const quantity = parseQuantity(raw ?? undefined);
  if (quantity <= 0) return 'skipped';

  const tenantSlug = await resolveTenantSlug(parsed.tenantId);
  if (!tenantSlug) {
    errors.push(`tenant no encontrado para id=${parsed.tenantId} (clave ${key})`);
    return 'skipped';
  }

  return persistAndDelete(redis, { key, ...parsed, tenantSlug, quantity }, errors);
}

/**
 * Lee contadores `usage:*` en Redis, persiste en `platform.billing_usage` y borra la clave si el insert OK.
 * Ejecutar un solo worker a la vez (cron) para reducir carreras.
 */
export async function runFlushBillingUsage(): Promise<FlushBillingUsageResult> {
  const errors: string[] = [];
  const redis = await getMeteringRedis();
  if (!redis) {
    return {
      keysScanned: 0,
      rowsInserted: 0,
      keysSkipped: 0,
      keysDeleted: 0,
      errors: ['REDIS_URL no configurado'],
    };
  }

  let keysScanned = 0;
  let rowsInserted = 0;
  let keysSkipped = 0;
  let keysDeleted = 0;

  try {
    for await (const key of redis.scanIterator({
      MATCH: 'usage:*',
      COUNT: 200,
    })) {
      if (typeof key !== 'string') {
        continue;
      }
      keysScanned += 1;
      const outcome = await flushOneKey(redis, key, errors);
      if (outcome === 'inserted_deleted') {
        rowsInserted += 1;
        keysDeleted += 1;
      } else if (outcome === 'inserted_redis_del_failed') {
        rowsInserted += 1;
      } else {
        keysSkipped += 1;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`scan/flush: ${msg}`);
  }

  return {
    keysScanned,
    rowsInserted,
    keysSkipped,
    keysDeleted,
    errors,
  };
}
