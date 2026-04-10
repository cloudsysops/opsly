import { insertBillingUsageLine } from "./billing-usage-repository";
import { scheduleBudgetCheckAfterUsage } from "./budget-check-queue";
import { logMeteringAudit } from "./metering-audit-log";
import { pushMeteringFallback } from "./metering-fallback-queue";
import { incrementUsageCounter } from "./redis-metering";
import type { MeteringEventPayload } from "./types";

export interface MeteringRecordOptions {
  /** Si true, intenta insertar fila en Postgres (además de Redis + audit). */
  readonly persistLine?: boolean;
  readonly unitCostUsd?: number;
}

async function processMetering(
  payload: MeteringEventPayload,
  options: MeteringRecordOptions,
): Promise<void> {
  logMeteringAudit(payload, { persist_line: options.persistLine === true });
  const redisOk = await incrementUsageCounter(
    payload.tenantId,
    payload.metricType,
    payload.quantity,
  );
  if (!redisOk) {
    pushMeteringFallback(payload);
  }
  if (options.persistLine === true && options.unitCostUsd !== undefined) {
    await insertBillingUsageLine({
      tenantId: payload.tenantId,
      metricType: payload.metricType,
      quantity: payload.quantity,
      unitCost: options.unitCostUsd,
      metadata: { operation: payload.operation, kind: payload.kind },
    });
    scheduleBudgetCheckAfterUsage(payload.tenantId);
  }
}

/**
 * Fire-and-forget: no bloquea la respuesta HTTP. Fallos aislados en logs / cola fallback.
 */
export function scheduleMeteringProcessing(
  payload: MeteringEventPayload,
  options: MeteringRecordOptions = {},
): void {
  queueMicrotask(() => {
    void processMetering(payload, options).catch((e: unknown) => {
      console.error("[metering] processMetering failed", e);
      pushMeteringFallback(payload);
    });
  });
}
