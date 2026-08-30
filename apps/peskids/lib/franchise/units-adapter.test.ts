import { describe, expect, it } from 'vitest';
import {
  peskidsUnitStatus,
  peskidsUnitToFranchiseUnit,
  type PeskidsFranchiseRow,
} from './units.adapter';
import { buildSalesReportInput, type RevenueFact } from './sales-report.adapter';

const flagshipRow: PeskidsFranchiseRow = {
  id: '11111111-1111-4111-8111-111111111111',
  tenant_slug: 'peskids',
  slug: 'llanogrande-principal',
  name: 'Llanogrande Principal',
  type: 'flagship',
  status: 'active',
  is_primary: true,
};

describe('peskidsUnitToFranchiseUnit', () => {
  it('maps a flagship into a generic owned unit without a franchisee', () => {
    const unit = peskidsUnitToFranchiseUnit(flagshipRow);
    expect(unit.code).toBe('llanogrande-principal');
    expect(unit.type).toBe('flagship');
    expect(unit.status).toBe('active');
    expect(unit.franchiseeId).toBeNull();
    expect(unit.externalSource).toBe('platform.peskids_franchises');
    expect(unit.externalRef).toBe(flagshipRow.id);
    expect(unit.openingStatus).toBe('completed');
  });

  it('maps paused to suspended and archived to archived', () => {
    expect(peskidsUnitStatus('paused')).toBe('suspended');
    expect(peskidsUnitToFranchiseUnit({ ...flagshipRow, status: 'archived' }).status).toBe(
      'archived'
    );
    expect(peskidsUnitToFranchiseUnit({ ...flagshipRow, status: 'archived' }).openingStatus).toBe(
      'not_started'
    );
  });
});

describe('buildSalesReportInput', () => {
  it('wraps a revenue fact into the core SalesReport shape', () => {
    const fact: RevenueFact = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: 'peskids',
      unitId: 'u1',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      gross: 10_000_000,
      refunds: 500_000,
      taxes: 1_900_000,
      excluded: 1_000_000,
      net: 7_100_000,
      currency: 'COP',
      provider: 'wompi',
      providerReference: 'tx_123',
    };
    const report = buildSalesReportInput(fact);
    expect(report.id).toBe(fact.id);
    expect(report.grossSales).toBe(10_000_000);
    expect(report.excludedSales).toBe(1_000_000);
    expect(report.netSales).toBe(7_100_000);
    expect(report.currency).toBe('COP');
  });

  it('never emits negative net sales', () => {
    const report = buildSalesReportInput({
      id: 'x',
      tenantId: 'peskids',
      unitId: 'u1',
      periodStart: '2026-06-01T00:00:00.000Z',
      periodEnd: '2026-06-30T23:59:59.999Z',
      gross: 100,
      refunds: 500,
      taxes: 0,
      excluded: 0,
      net: 0,
      currency: 'COP',
      provider: 'manual',
    });
    expect(report.netSales).toBeGreaterThanOrEqual(0);
  });
});
