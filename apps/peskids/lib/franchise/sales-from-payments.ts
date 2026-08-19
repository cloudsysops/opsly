import type { SalesReport, SalesSource } from '@intcloudsysops/franchise-core';

export type PaymentRow = {
  amount_cents: number;
  provider: string | null;
  paid_at: string;
  status: string;
  franchise_id?: string | null;
};

const PROVIDER_SOURCE: Record<string, SalesSource> = {
  stripe: 'stripe',
  wompi: 'wompi',
};

export function salesReportFromPayments(input: {
  id: string;
  tenantId: string;
  unitId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  payments: readonly PaymentRow[];
}): SalesReport {
  const paid = input.payments.filter((row) => row.status === 'paid');
  const gross = paid.reduce((sum, row) => sum + row.amount_cents, 0);
  const sources = new Set(paid.map((row) => PROVIDER_SOURCE[row.provider ?? ''] ?? 'platform'));
  const source: SalesSource = sources.size === 1 ? [...sources][0] ?? 'platform' : 'platform';
  return {
    id: input.id,
    tenantId: input.tenantId,
    unitId: input.unitId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    grossSalesMinor: gross,
    refundsMinor: 0,
    taxesMinor: 0,
    excludedSalesMinor: 0,
    netSalesMinor: gross,
    currency: input.currency,
    source,
    sourceReference: `peskids.payments:${input.periodStart}:${input.periodEnd}`,
    status: 'submitted',
  };
}
