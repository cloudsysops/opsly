import type { SupabaseClient } from "@supabase/supabase-js";

import type { BillingMetricType } from "../billing/types";
import { BaseRepository } from "../base-repository";
import { getServiceClient } from "../supabase";
import type { Database, Json } from "../supabase/types";

export type InsertBillingUsageMeteredParams = {
  readonly metricType: BillingMetricType;
  readonly quantity: number;
  readonly unitCostUsd: number;
  readonly metadata?: Json;
};

/**
 * Escrituras en `platform.billing_usage` con inyección de `tenant_id` vía ALS.
 */
export class BillingUsageRepository extends BaseRepository {
  constructor(client: SupabaseClient<Database> = getServiceClient()) {
    super(client);
  }

  /**
   * Inserta una fila de consumo consolidado (requiere `runWithTenantContext`).
   */
  async insertMeteredUsage(
    params: InsertBillingUsageMeteredParams,
  ): Promise<{ error: Error | null }> {
    const { error } = await this.insert(
      "billing_usage",
      {
        metric_type: params.metricType,
        quantity: params.quantity,
        unit_cost: params.unitCostUsd,
        metadata: params.metadata ?? {},
      },
      { tenantColumn: "tenant_id" },
    );
    return { error: error ? new Error(error.message) : null };
  }
}
