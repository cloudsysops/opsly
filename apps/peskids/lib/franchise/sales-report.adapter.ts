/**
 * Peskids → Franchise OS sales-report adapter (pure mapping).
 *
 * Aggregated revenue facts (enrollments, payments, manual overrides) are turned
 * into the provider-agnostic `SalesReport` shape consumed by the versioned
 * royalty engine. Royalty arithmetic itself lives in @intcloudsysops/franchise-core
 * and is NOT reimplemented here.
 *
 * Pure functions: no DB, no network.
 */

import type {
  SalesReportLike,
  SalesReportSource,
  SalesReportStatus,
} from '@intcloudsysops/franchise-core';

export type RevenueFact = {
  id: string;
  tenantId: string;
  unitId: string;
  periodStart: string;
  periodEnd: string;
  gross: number;
  refunds: number;
  taxes: number;
  excluded: number;
  net: number;
  currency: string;
  provider: SalesReportSource;
  /** e.g. Wompi transaction id / Stripe payment id / manual entry ref. */
  providerReference?: string | null;
  status?: SalesReportStatus;
  submittedAt?: string | null;
};

export function salesReportSourceFromProvider(
  provider: RevenueFact['provider']
): SalesReportSource {
  return provider;
}

/** Minimal required exported signature for the core royalty arithmetic. */
export type CoreSalesReportInput = SalesReportLike & { id: string };

/**
 * Maps an aggregated revenue fact into a `SalesReport`-compatible input for
 * the royalty engine. The engine reads gross/net, refunds, taxes and exclusions
 * per the rule basis; summary fields are derived here so the engine stays pure.
 */
export function buildSalesReportInput(fact: RevenueFact): CoreSalesReportInput {
  const net = fact.net > 0 ? fact.net : fact.gross - fact.refunds - fact.taxes - fact.excluded;
  const excluded = fact.excluded > 0 ? fact.excluded : 0;
  return {
    id: fact.id,
    grossSales: fact.gross,
    refunds: fact.refunds,
    taxes: fact.taxes,
    excludedSales: excluded,
    // Cap net at 0 so a bad aggregation can never produce negative net sales.
    netSales: Math.max(0, net),
    currency: fact.currency,
    periodStart: fact.periodStart,
    periodEnd: fact.periodEnd,
  };
}

export function reportStatusFromProvider(factStatus: RevenueFact['status']): SalesReportStatus {
  return factStatus ?? 'submitted';
}
