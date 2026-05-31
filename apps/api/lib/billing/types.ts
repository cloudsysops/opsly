import type { BILLING_METRICS } from '../constants';

/** Tipos de métrica alineados a `platform.billing_usage.metric_type` (migración 0015). */
export type BillingMetricType = (typeof BILLING_METRICS)[number];

export type MeteringOperationKind = 'resource' | 'token';

export interface MeteringEventPayload {
  readonly tenantId: string;
  readonly metricType: BillingMetricType;
  readonly quantity: number;
  readonly operation: string;
  readonly kind: MeteringOperationKind;
  readonly requestId?: string;
}
