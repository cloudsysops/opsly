import { describe, expect, it } from 'vitest';
import { calculateRoyalty, nextRoyaltyRuleVersion, royaltyIdempotencyKey, assertCalculationImmutable, RoyaltyError } from './royalty.js';
import type { RoyaltyRule, SalesReport } from './types.js';

const rule: RoyaltyRule = {
  id: 'rule-1',
  tenantId: 'tenant-a',
  name: 'Standard',
  basis: 'gross_sales',
  percentageBps: 500,
  minimumAmountMinor: 200_000,
  fixedFeeMinor: 10_000,
  currency: 'COP',
  frequency: 'monthly',
  excludedCategories: ['retail_kit'],
  taxTreatment: 'exclusive',
  effectiveFrom: '2026-01-01',
  effectiveTo: null,
  version: 1,
};

const report: SalesReport = {
  id: 'sr-1',
  tenantId: 'tenant-a',
  unitId: 'unit-1',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-31',
  grossSalesMinor: 10_000_000,
  refundsMinor: 0,
  taxesMinor: 0,
  excludedSalesMinor: 1_000_000,
  netSalesMinor: 9_000_000,
  currency: 'COP',
  source: 'manual',
  sourceReference: null,
  status: 'accepted',
};

describe('royalty engine', () => {
  it('computes base = reported - exclusions, then percent + fixed, then minimum', () => {
    const calc = calculateRoyalty({
      id: 'calc-1',
      rule,
      report,
      unitId: 'unit-1',
      calculatedAt: '2026-08-01T00:00:00.000Z',
    });
    // base 9_000_000 * 5% = 450_000 + 10_000 = 460_000 > minimum 200_000
    expect(calc.inputs.royaltyBaseMinor).toBe(9_000_000);
    expect(calc.royaltyDueMinor).toBe(460_000);
    expect(calc.ruleVersion).toBe(1);
    expect(calc.idempotencyKey).toBe(royaltyIdempotencyKey({
      tenantId: 'tenant-a',
      salesReportId: 'sr-1',
      royaltyRuleId: 'rule-1',
      ruleVersion: 1,
    }));
  });

  it('applies minimum when percent+fixed is below the floor', () => {
    const small: SalesReport = { ...report, id: 'sr-small', grossSalesMinor: 100_000, excludedSalesMinor: 0 };
    const calc = calculateRoyalty({
      id: 'calc-min',
      rule,
      report: small,
      unitId: 'unit-1',
      calculatedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(calc.royaltyDueMinor).toBe(200_000);
  });

  it('is reproducible for the same inputs', () => {
    const a = calculateRoyalty({ id: 'a', rule, report, unitId: 'unit-1', calculatedAt: '2026-08-01T00:00:00.000Z' });
    const b = calculateRoyalty({ id: 'b', rule, report, unitId: 'unit-1', calculatedAt: '2026-08-02T00:00:00.000Z' });
    expect(a.royaltyDueMinor).toBe(b.royaltyDueMinor);
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.inputs).toEqual(b.inputs);
  });

  it('does not rewrite history when the rule version changes', () => {
    const v1 = calculateRoyalty({ id: 'c1', rule, report, unitId: 'unit-1', calculatedAt: '2026-08-01T00:00:00.000Z' });
    const v2Rule = nextRoyaltyRuleVersion(rule, { percentageBps: 800 });
    const v2 = calculateRoyalty({
      id: 'c2',
      rule: v2Rule,
      report,
      unitId: 'unit-1',
      calculatedAt: '2026-08-15T00:00:00.000Z',
    });
    expect(v2Rule.version).toBe(2);
    expect(v1.royaltyDueMinor).toBe(460_000);
    expect(v2.royaltyDueMinor).not.toBe(v1.royaltyDueMinor);
    expect(v2.idempotencyKey).not.toBe(v1.idempotencyKey);
    expect(() => assertCalculationImmutable(v1, v1)).not.toThrow();
    expect(() =>
      assertCalculationImmutable(v1, { ...v1, royaltyDueMinor: 1 })
    ).toThrow(RoyaltyError);
  });

  it('uses net_sales when the basis says so', () => {
    const netRule: RoyaltyRule = { ...rule, basis: 'net_sales', minimumAmountMinor: null, fixedFeeMinor: 0 };
    const calc = calculateRoyalty({
      id: 'net',
      rule: netRule,
      report,
      unitId: 'unit-1',
      calculatedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(calc.inputs.reportedSalesMinor).toBe(9_000_000);
    expect(calc.inputs.royaltyBaseMinor).toBe(8_000_000);
    expect(calc.royaltyDueMinor).toBe(400_000);
  });

  it('rejects cross-tenant rule/report pairs', () => {
    expect(() =>
      calculateRoyalty({
        id: 'x',
        rule,
        report: { ...report, tenantId: 'tenant-b' },
        unitId: 'unit-1',
        calculatedAt: '2026-08-01T00:00:00.000Z',
      })
    ).toThrow(RoyaltyError);
  });
});
