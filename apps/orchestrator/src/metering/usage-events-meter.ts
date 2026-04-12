/**
 * Medición vía Redis para el Billing Flush Worker (`usage:{tenantId}:{metric}`).
 * Alineado con `apps/api/lib/billing/redis-metering.ts` (ai_tokens → INCR entero, cpu_seconds → INCRBYFLOAT).
 * Ya no escribe en `platform.usage_events` desde el orchestrator.
 */
import { getOrchestratorRedis } from "./redis-client.js";
import { resolveTenantUuid } from "./tenant-id.js";

/** Métricas compatibles con `BillingMetricType` en la API (subset usado aquí). */
export type OrchestratorMeterMetric = "ai_tokens" | "cpu_seconds";

export function usageRedisKey(
  tenantId: string,
  metric: OrchestratorMeterMetric,
): string {
  return `usage:${tenantId}:${metric}`;
}

export type PlannerLlmMetrics = {
  model_used: string;
  tokens_input: number;
  tokens_output: number;
};

const pendingMetering = new Set<Promise<void>>();

function scheduleMetering(fn: () => Promise<void>): void {
  const pending = new Promise<void>((resolve) => {
    setImmediate(() => {
      void fn()
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[orchestrator-meter]", msg);
        })
        .finally(resolve);
    });
  });
  pendingMetering.add(pending);
  void pending.finally(() => {
    pendingMetering.delete(pending);
  });
}

export async function drainMeteringOperations(): Promise<void> {
  if (pendingMetering.size === 0) {
    return;
  }
  await Promise.allSettled([...pendingMetering]);
}

/**
 * Hermes: acumula `cpu_seconds` en Redis (`usage:{tenantId}:cpu_seconds`) por duración de tarea.
 * Reutiliza el mismo pipeline que `meterRemotePlanWorkerFireAndForget` (billing flush API).
 */
export function meterHermesTaskCpuFireAndForget(
  tenantSlug: string,
  tenantIdHint: string | undefined,
  durationMs: number,
): void {
  const sec = Math.max(0, durationMs / 1000);
  meterRemotePlanWorkerFireAndForget(tenantSlug, tenantIdHint, sec);
}

/**
 * Incrementa `usage:{tenantId}:ai_tokens` por el total de tokens (entero), fire-and-forget.
 */
export function meterPlannerLlmFireAndForget(
  tenantSlug: string,
  tenantIdHint: string | undefined,
  metrics: PlannerLlmMetrics,
): void {
  scheduleMetering(async () => {
    const tenantId = await resolveTenantUuid(tenantSlug, tenantIdHint);
    if (!tenantId) {
      return;
    }
    const redis = getOrchestratorRedis();
    if (!redis) {
      return;
    }
    const total = Math.round(
      Math.max(0, metrics.tokens_input) + Math.max(0, metrics.tokens_output),
    );
    if (total <= 0) {
      return;
    }
    const key = usageRedisKey(tenantId, "ai_tokens");
    await redis.incrby(key, total);
  });
}

/**
 * Incrementa `usage:{tenantId}:cpu_seconds` por duración de la fase remote_plan, fire-and-forget.
 */
export function meterRemotePlanWorkerFireAndForget(
  tenantSlug: string,
  tenantIdHint: string | undefined,
  durationSeconds: number,
): void {
  scheduleMetering(async () => {
    const tenantId = await resolveTenantUuid(tenantSlug, tenantIdHint);
    if (!tenantId) {
      return;
    }
    const redis = getOrchestratorRedis();
    if (!redis) {
      return;
    }
    const delta = Math.max(0, durationSeconds);
    if (delta <= 0) {
      return;
    }
    const key = usageRedisKey(tenantId, "cpu_seconds");
    await redis.incrbyfloat(key, delta);
  });
}
