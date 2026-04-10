import { getServiceClient } from "../supabase/client";
import type { BillingMetricType } from "./types";

export interface BillingUsageInsert {
  readonly tenantId: string;
  readonly metricType: BillingMetricType;
  readonly quantity: number;
  readonly unitCost: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Persiste una línea en `platform.billing_usage` (service role).
 * Errores: solo log; no lanza (uso desde medición async).
 */
export async function insertBillingUsageLine(row: BillingUsageInsert): Promise<void> {
  try {
    const supabase = getServiceClient();
    const { error } = await supabase.schema("platform").from("billing_usage").insert({
      tenant_id: row.tenantId,
      metric_type: row.metricType,
      quantity: row.quantity,
      unit_cost: row.unitCost,
      metadata: row.metadata ?? {},
    });
    if (error) {
      console.error("[billing_usage] insert failed", error.message);
    }
  } catch (e) {
    console.error("[billing_usage] insert exception", e);
  }
}
