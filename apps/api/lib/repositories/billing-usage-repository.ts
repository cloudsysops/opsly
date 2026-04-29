import type { SupabaseClient } from '@supabase/supabase-js';

import { BaseRepository } from '../base-repository';
import type { BillingMetricType } from '../billing/types';
import { getServiceClient } from '../supabase';
import type { Database, Json } from '../supabase/types';

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
    params: InsertBillingUsageMeteredParams
  ): Promise<{ error: Error | null }> {
    const { error } = await this.insert(
      'billing_usage',
      {
        metric_type: params.metricType,
        quantity: params.quantity,
        unit_cost: params.unitCostUsd,
        metadata: params.metadata ?? {},
      },
      { tenantColumn: 'tenant_id' }
    );
    return { error: error ? new Error(error.message) : null };
  }

  /**
   * Suma `total_amount` en el mes actual o desde `recorded_at >= recordedAtGte` (UTC).
   * Requiere `runWithTenantContext` / `runTrustedPortalDal`.
   */
  async sumSettledTotalAmountSince(
    recordedAtGteIso: string
  ): Promise<{ value: number; error: Error | null }> {
    const { data, error } = await this.select('billing_usage', 'total_amount, recorded_at', {
      tenantColumn: 'tenant_id',
    }).gte('recorded_at', recordedAtGteIso);

    if (error) {
      return { value: 0, error: new Error(error.message) };
    }

    // Calculate sum in application code to avoid RLS aggregate restriction
    const rows = Array.isArray(data) ? data as Array<{ total_amount?: number }> : [];
    const sum = rows.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
    return { value: sum, error: null };
  }
}

function extractAggregateSum(data: unknown): number {
  if (!Array.isArray(data) || data.length === 0) {
    return 0;
  }
  const row = data[0] as Record<string, unknown>;
  if (row.sum !== undefined && row.sum !== null) {
    const n = Number(row.sum);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
