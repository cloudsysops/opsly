import { describe, expect, it } from 'vitest';
import { calculateRoyalty } from '@intcloudsysops/franchise-core';
import { FRANCHISE_SLUGS } from '@/lib/franchise-constants';
import { isSeedOwnedUnit, mapPeskidsOperatingNetwork } from '@/lib/franchise/map-operating-units';
import { salesReportFromPayments } from '@/lib/franchise/sales-from-payments';
import type { PeskidsFranchise } from '@/lib/services/franchise.service';

const llano: PeskidsFranchise = {
  id: 'op-llano',
  tenant_slug: 'peskids',
  slug: FRANCHISE_SLUGS.LLANOGRANDE_PRINCIPAL,
  name: 'Sede Llanogrande',
  type: 'flagship',
  status: 'active',
  parent_franchise_id: null,
  is_primary: true,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
};

const domicilio: PeskidsFranchise = {
  ...llano,
  id: 'op-dom',
  slug: FRANCHISE_SLUGS.DOMICILIOS_PESKIDS,
  name: 'Domicilios Peskids',
  type: 'mobile',
  is_primary: false,
};

describe('Peskids franchise adapter', () => {
  it('maps Llanogrande and Domicilios as owned units, not franchisees', () => {
    const units = mapPeskidsOperatingNetwork({
      tenantId: 'tenant-uuid',
      networkId: 'net-1',
      franchises: [llano, domicilio],
    });
    expect(units).toHaveLength(2);
    expect(units.every((u) => u.franchiseeId === null)).toBe(true);
    expect(units.map((u) => u.type).sort()).toEqual(['flagship', 'mobile']);
    expect(units.every((u) => isSeedOwnedUnit(u.code))).toBe(true);
  });

  it('builds a provider-neutral SalesReport from Peskids payments', () => {
    const report = salesReportFromPayments({
      id: 'sr-1',
      tenantId: 'tenant-uuid',
      unitId: 'op-llano',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      currency: 'COP',
      payments: [
        { amount_cents: 15000000, provider: 'stripe', paid_at: '2026-08-04', status: 'paid' },
        { amount_cents: 2000000, provider: 'wompi', paid_at: '2026-08-10', status: 'paid' },
        { amount_cents: 999, provider: 'stripe', paid_at: '2026-08-11', status: 'pending' },
      ],
    });
    expect(report.grossSalesMinor).toBe(17_000_000);
    expect(report.source).toBe('platform');
    const due = calculateRoyalty({
      id: 'c1',
      unitId: report.unitId,
      calculatedAt: '2026-09-01T00:00:00.000Z',
      report,
      rule: {
        id: 'rule-1',
        tenantId: 'tenant-uuid',
        name: 'Demo',
        basis: 'gross_sales',
        percentageBps: 500,
        minimumAmountMinor: null,
        fixedFeeMinor: 0,
        currency: 'COP',
        frequency: 'monthly',
        excludedCategories: [],
        taxTreatment: 'unspecified',
        effectiveFrom: '2026-01-01',
        effectiveTo: null,
        version: 1,
      },
    });
    expect(due.royaltyDueMinor).toBe(850_000);
  });
});
