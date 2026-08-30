import { describe, expect, it } from 'vitest';
import type { RoyaltyRule, SalesReport } from '../src/types.js';
import {
  RoyaltyCurrencyMismatchError,
  RoyaltyRuleExpiredError,
  RoyaltyRuleNotEffectiveError,
  buildRoyaltyCalculation,
  computeRoyalty,
  computeRoyaltyForReport,
  createNextRuleVersion,
  royaltyCalculationKey,
  roundMoney,
  ruleEffectiveOn,
  selectRuleForPeriod,
  snapshotRule,
} from '../src/royalty.js';

const TENANT = 'peskids';
const UNIT = '22222222-2222-4222-8222-222222222222';
const SALES_REPORT_ID = '33333333-3333-4333-8333-333333333333';
const RULE_ID = '44444444-4444-4444-8444-444444444444';

function rule(overrides: Partial<RoyaltyRule> = {}): RoyaltyRule {
  return {
    id: RULE_ID,
    tenantId: TENANT,
    name: 'Regla estándar 5%',
    version: 1,
    basis: 'gross_sales',
    percentage: 5,
    minimumAmount: null,
    fixedFee: null,
    currency: 'COP',
    frequency: 'monthly',
    excludedCategories: ['trial'],
    taxTreatment: 'exclusive',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    effectiveTo: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function sales(overrides: Partial<SalesReport> = {}): SalesReport {
  return {
    id: SALES_REPORT_ID,
    tenantId: TENANT,
    unitId: UNIT,
    periodStart: '2026-06-01T00:00:00.000Z',
    periodEnd: '2026-06-30T23:59:59.999Z',
    grossSales: 10_000_000,
    refunds: 500_000,
    taxes: 1_900_000,
    excludedSales: 1_000_000,
    netSales: 7_100_000,
    currency: 'COP',
    source: 'platform',
    status: 'submitted',
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('roundMoney', () => {
  it('rounds to two decimals', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
  });
});

describe('ruleEffectiveOn + snapshotRule', () => {
  it('is effective inside the window and not outside', () => {
    expect(ruleEffectiveOn(rule(), '2026-06-30T00:00:00.000Z')).toBe(true);
    expect(ruleEffectiveOn(rule(), '2025-12-31T00:00:00.000Z')).toBe(false);
  });

  it('snapshots the exact in-force rule values', () => {
    const s = snapshotRule(rule(), '2026-06-30T00:00:00.000Z');
    expect(s).toMatchObject({
      ruleId: RULE_ID,
      ruleVersion: 1,
      percentage: 5,
      basis: 'gross_sales',
    });
  });

  it('throws when the rule is not yet in force', () => {
    expect(() =>
      snapshotRule(rule({ effectiveFrom: '2027-01-01T00:00:00.000Z' }), '2026-06-30T00:00:00.000Z')
    ).toThrow(RoyaltyRuleNotEffectiveError);
  });

  it('throws when the rule expired before the period', () => {
    expect(() =>
      snapshotRule(rule({ effectiveTo: '2026-05-01T00:00:00.000Z' }), '2026-06-30T00:00:00.000Z')
    ).toThrow(RoyaltyRuleExpiredError);
  });
});

describe('selectRuleForPeriod', () => {
  it('picks the version in force for the report period', () => {
    const v1 = rule();
    const v2 = rule({
      version: 2,
      percentage: 6,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
      effectiveTo: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    const v1Closed = { ...v1, effectiveTo: '2026-06-30T23:59:59.999Z' };
    const s = selectRuleForPeriod([v1Closed, v2], '2026-06-15T00:00:00.000Z');
    expect(s.ruleVersion).toBe(1);
    expect(s.percentage).toBe(5);

    const s2 = selectRuleForPeriod([v1Closed, v2], '2026-08-15T00:00:00.000Z');
    expect(s2.ruleVersion).toBe(2);
    expect(s2.percentage).toBe(6);
  });

  it('throws when no rule is in force', () => {
    expect(() =>
      selectRuleForPeriod(
        [rule({ effectiveFrom: '2027-01-01T00:00:00.000Z' })],
        '2026-06-15T00:00:00.000Z'
      )
    ).toThrow(RoyaltyRuleNotEffectiveError);
  });
});

describe('computeRoyalty', () => {
  it('computes gross basis with exclusions', () => {
    const breakdown = computeRoyalty({
      sales: sales(),
      rule: snapshotRule(rule(), '2026-06-30T00:00:00.000Z'),
    });
    expect(breakdown.reportedSales).toBe(10_000_000);
    expect(breakdown.exclusions).toBe(1_000_000);
    expect(breakdown.royaltyBase).toBe(9_000_000);
    expect(breakdown.percentageAmount).toBe(450_000);
    expect(breakdown.royaltyDue).toBe(450_000);
  });

  it('computes net basis without exclusions', () => {
    const r = snapshotRule(rule({ basis: 'net_sales' }), '2026-06-30T00:00:00.000Z');
    const breakdown = computeRoyalty({ sales: sales(), rule: r });
    expect(breakdown.reportedSales).toBe(7_100_000);
    expect(breakdown.exclusions).toBe(0);
    expect(breakdown.royaltyDue).toBe(roundMoney(7_100_000 * 0.05));
  });

  it('applies fixed fees', () => {
    const r = snapshotRule(
      rule({ fixedFee: { amount: 50_000, currency: 'COP' } }),
      '2026-06-30T00:00:00.000Z'
    );
    const breakdown = computeRoyalty({ sales: sales(), rule: r });
    expect(breakdown.royaltyDue).toBe(500_000);
  });

  it('applies minimum when due is below it', () => {
    const r = snapshotRule(
      rule({ minimumAmount: { amount: 1_000_000, currency: 'COP' } }),
      '2026-06-30T00:00:00.000Z'
    );
    const breakdown = computeRoyalty({ sales: sales({ grossSales: 5_000_000 }), rule: r });
    expect(breakdown.minimumApplied).toBe(true);
    expect(breakdown.royaltyDue).toBe(1_000_000);
  });

  it('throws on currency mismatch', () => {
    expect(() =>
      computeRoyalty({
        sales: sales({ currency: 'USD' }),
        rule: snapshotRule(rule(), '2026-06-30T00:00:00.000Z'),
      })
    ).toThrow(RoyaltyCurrencyMismatchError);
  });
});

describe('buildRoyaltyCalculation (reproducibility)', () => {
  it('persists inputs, calculation and result snapshots', () => {
    const calc = buildRoyaltyCalculation({
      tenantId: TENANT,
      unitId: UNIT,
      salesReport: sales(),
      rule: snapshotRule(rule(), '2026-06-30T00:00:00.000Z'),
    });
    expect(calc.royaltyDue).toBe(450_000);
    expect(calc.ruleVersion).toBe(1);
    expect(calc.inputs.salesReportId).toBe(SALES_REPORT_ID);
    expect(calc.calculation.royaltyBase).toBe(9_000_000);
    expect(calc.result.formula).toContain('× 5%');
    expect(calc.result.ruleVersion).toBe(1);
  });

  it('is deterministic: same inputs → same result', () => {
    const r = snapshotRule(rule(), '2026-06-30T00:00:00.000Z');
    const a = computeRoyalty({ sales: sales(), rule: r });
    const b = computeRoyalty({ sales: sales(), rule: r });
    expect(a).toEqual(b);
  });
});

describe('royaltyCalculationKey (idempotency)', () => {
  it('produces a stable key per sales+rule version', () => {
    const key = royaltyCalculationKey({
      tenantId: TENANT,
      unitId: UNIT,
      salesReportId: SALES_REPORT_ID,
      ruleVersion: 1,
    });
    expect(key).toBe(`${TENANT}:${UNIT}:${SALES_REPORT_ID}:v1`);
    expect(key).toBe(
      royaltyCalculationKey({
        tenantId: TENANT,
        unitId: UNIT,
        salesReportId: SALES_REPORT_ID,
        ruleVersion: 1,
      })
    );
    expect(key).not.toBe(
      royaltyCalculationKey({
        tenantId: TENANT,
        unitId: UNIT,
        salesReportId: SALES_REPORT_ID,
        ruleVersion: 2,
      })
    );
  });
});

describe('computeRoyaltyForReport', () => {
  it('selects the in-force rule and builds the calculation in one call', () => {
    const v1 = rule();
    const v2 = rule({
      version: 2,
      percentage: 6,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
      createdAt: '2026-07-01T00:00:00.000Z',
    });
    const calc = computeRoyaltyForReport({
      rules: [{ ...v1, effectiveTo: '2026-06-30T23:59:59.999Z' }, v2],
      salesReport: sales(),
      tenantId: TENANT,
      unitId: UNIT,
    });
    expect(calc.ruleVersion).toBe(1);
    expect(calc.royaltyDue).toBe(450_000);
  });
});

describe('createNextRuleVersion', () => {
  it('bumps the version and closes the previous window', () => {
    const v1 = rule();
    const { next, superseded } = createNextRuleVersion(v1, {
      percentage: 6,
      effectiveFrom: '2026-07-01T00:00:00.000Z',
    });
    expect(next.version).toBe(2);
    expect(next.percentage).toBe(6);
    expect(next.effectiveTo).toBeNull();
    expect(superseded.version).toBe(1);
    expect(superseded.effectiveTo).toBe('2026-06-30T23:59:59.999Z');
    expect(ruleEffectiveOn(superseded, '2026-06-30T12:00:00.000Z')).toBe(true);
    expect(ruleEffectiveOn(superseded, '2026-07-01T00:00:00.000Z')).toBe(false);
    expect(ruleEffectiveOn(next, '2026-07-01T00:00:00.000Z')).toBe(true);
  });

  it('rejects a backdated new version', () => {
    expect(() =>
      createNextRuleVersion(rule(), { percentage: 6, effectiveFrom: '2025-01-01T00:00:00.000Z' })
    ).toThrow();
  });
});
