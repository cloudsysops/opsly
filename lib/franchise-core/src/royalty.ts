/**
 * Royalty engine — versioned, reproducible and immutable-by-design.
 *
 * Contract with the persistence layer:
 *  - A `RoyaltyRule` is versioned: a new version opens a new `effectiveFrom`
 *    window and *closes* the previous one (`effectiveTo`). History is never
 *    mutated in place.
 *  - A `RoyaltyCalculation` pins `ruleVersion` and snapshots all inputs, the
 *    arithmetic steps and the result as JSON. Past calculations are explained
 *    from the snapshot, never silently recomputed with a later rule.
 *  - `computeRoyaltyForReport` is deterministic: same sales + same rule
 *    snapshot → same result. Idempotency is provided by `royaltyCalculationKey`.
 *
 * This module is pure — no DB, no scheduling, no payment rail.
 */

import type {
  MoneyAmount,
  RoyaltyBasis,
  RoyaltyCalculation,
  RoyaltyCalculationStatus,
  RoyaltyFrequency,
  RoyaltyRule,
  TaxTreatment,
} from './types.js';

const DEFAULT_STATUS: RoyaltyCalculationStatus = 'pending';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class RoyaltyRuleNotEffectiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoyaltyRuleNotEffectiveError';
  }
}

export class RoyaltyRuleExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoyaltyRuleExpiredError';
  }
}

export class RoyaltyCurrencyMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoyaltyCurrencyMismatchError';
  }
}

export type SalesReportLike = {
  id?: string;
  grossSales: number;
  refunds: number;
  taxes: number;
  excludedSales: number;
  netSales: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
};

/** Immutable snapshot of the rule as it was in force for a period. */
export type RoyaltyRuleSnapshot = {
  ruleId: string;
  ruleVersion: number;
  name: string;
  basis: RoyaltyBasis;
  percentage: number;
  fixedFee: number;
  minimum: number | null;
  currency: string;
  excludedCategories: readonly string[];
  taxTreatment: TaxTreatment;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type RoyaltyBreakdown = {
  basis: RoyaltyBasis;
  reportedSales: number;
  exclusions: number;
  royaltyBase: number;
  percentage: number;
  percentageAmount: number;
  fixedFee: number;
  minimum: number | null;
  minimumApplied: boolean;
  royaltyDue: number;
  currency: string;
};

/** True when a rule version is in force on `asOfDate` (inclusive of both bounds). */
export function ruleEffectiveOn(
  rule: { effectiveFrom: string; effectiveTo?: string | null },
  asOfDate: string
): boolean {
  const asOf = new Date(asOfDate).getTime();
  const from = new Date(rule.effectiveFrom).getTime();
  if (asOf < from) return false;
  if (rule.effectiveTo && asOf > new Date(rule.effectiveTo).getTime()) return false;
  return true;
}

/** Validates the rule was in force on `asOfDate`; throws otherwise. */
export function assertRuleEffectiveForPeriod(
  rule: { effectiveFrom: string; effectiveTo?: string | null; name?: string; version?: number },
  asOfDate: string
): void {
  const asOf = new Date(asOfDate).getTime();
  if (asOf < new Date(rule.effectiveFrom).getTime()) {
    throw new RoyaltyRuleNotEffectiveError(
      `Royalty rule ${rule.name ?? ''}#${rule.version ?? ''} is not in force on ${asOfDate} (effectiveFrom=${rule.effectiveFrom})`
    );
  }
  if (rule.effectiveTo && asOf > new Date(rule.effectiveTo).getTime()) {
    throw new RoyaltyRuleExpiredError(
      `Royalty rule ${rule.name ?? ''}#${rule.version ?? ''} expired on ${rule.effectiveTo} (periodEnd=${asOfDate})`
    );
  }
}

export function snapshotRule(rule: RoyaltyRule, asOfDate: string): RoyaltyRuleSnapshot {
  assertRuleEffectiveForPeriod(rule, asOfDate);
  return {
    ruleId: rule.id,
    ruleVersion: rule.version,
    name: rule.name,
    basis: rule.basis,
    percentage: rule.percentage,
    fixedFee: roundMoney(rule.fixedFee?.amount ?? 0),
    minimum:
      rule.minimumAmount !== null && rule.minimumAmount !== undefined
        ? roundMoney(rule.minimumAmount.amount)
        : null,
    currency: rule.currency,
    excludedCategories: rule.excludedCategories ?? [],
    taxTreatment: rule.taxTreatment,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo ?? null,
  };
}

/**
 * Selects the rule in force for the report's `periodEnd` (as-of semantics).
 * When multiple versions are technically active, prefers the most recent
 * `effectiveFrom`, then the highest version. Throws when none is in force.
 */
export function selectRuleForPeriod(
  rules: readonly RoyaltyRule[],
  periodEnd: string
): RoyaltyRuleSnapshot {
  const active = rules.filter((r) => ruleEffectiveOn(r, periodEnd));
  if (active.length === 0) {
    throw new RoyaltyRuleNotEffectiveError(`No royalty rule is in force on ${periodEnd}`);
  }
  const sorted = [...active].sort((a, b) => {
    const diff = new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
    if (diff !== 0) return diff;
    return b.version - a.version;
  });
  return snapshotRule(sorted[0], periodEnd);
}

/**
 * Core royalty arithmetic (reproducible):
 *   reported_sales − allowed exclusions = royalty_base
 *   royalty_base × percentage + fixed fees = royalty_due
 *   apply minimumAmount when due < minimum.
 */
export function computeRoyalty(input: {
  sales: SalesReportLike;
  rule: RoyaltyRuleSnapshot;
}): RoyaltyBreakdown {
  const { sales, rule } = input;
  if (sales.currency !== rule.currency) {
    throw new RoyaltyCurrencyMismatchError(
      `Sales currency ${sales.currency} does not match rule currency ${rule.currency}`
    );
  }
  const reportedSales = roundMoney(
    rule.basis === 'gross_sales' ? sales.grossSales : sales.netSales
  );
  const exclusions = roundMoney(rule.basis === 'gross_sales' ? sales.excludedSales : 0);
  const royaltyBase = roundMoney(Math.max(0, reportedSales - exclusions));
  const percentageAmount = roundMoney(royaltyBase * (rule.percentage / 100));
  const beforeMinimum = roundMoney(percentageAmount + rule.fixedFee);
  let royaltyDue = beforeMinimum;
  let minimumApplied = false;
  if (rule.minimum !== null && royaltyDue < rule.minimum) {
    royaltyDue = roundMoney(rule.minimum);
    minimumApplied = true;
  }
  return {
    basis: rule.basis,
    reportedSales,
    exclusions,
    royaltyBase,
    percentage: rule.percentage,
    percentageAmount,
    fixedFee: rule.fixedFee,
    minimum: rule.minimum,
    minimumApplied,
    royaltyDue,
    currency: rule.currency,
  };
}

/** Deterministic idempotency key for a royalty calculation. */
export function royaltyCalculationKey(input: {
  tenantId: string;
  unitId: string;
  salesReportId: string;
  ruleVersion: number;
}): string {
  return `${input.tenantId}:${input.unitId}:${input.salesReportId}:v${input.ruleVersion}`;
}

export type BuildRoyaltyCalculationInput = {
  id?: string;
  tenantId: string;
  unitId: string;
  salesReport: SalesReportLike & { id: string };
  rule: RoyaltyRuleSnapshot;
  status?: RoyaltyCalculationStatus;
  createdAt?: string;
};

/**
 * Builds an immutable `RoyaltyCalculation` with inputs/calculation/result
 * persisted as JSON so the history is explainable without recomputation.
 */
export function buildRoyaltyCalculation(input: BuildRoyaltyCalculationInput): RoyaltyCalculation {
  const { salesReport, rule } = input;
  const breakdown = computeRoyalty({ sales: salesReport, rule });
  const formula = `${breakdown.royaltyBase} (base) × ${rule.percentage}% + ${rule.fixedFee} (fixed)`;
  const calculation: RoyaltyCalculation = {
    id:
      input.id ??
      royaltyCalculationKey({
        tenantId: input.tenantId,
        unitId: input.unitId,
        salesReportId: salesReport.id,
        ruleVersion: rule.ruleVersion,
      }),
    tenantId: input.tenantId,
    unitId: input.unitId,
    salesReportId: salesReport.id,
    ruleId: rule.ruleId,
    ruleVersion: rule.ruleVersion,
    basis: rule.basis,
    reportedSales: breakdown.reportedSales,
    exclusions: breakdown.exclusions,
    royaltyBase: breakdown.royaltyBase,
    percentage: rule.percentage,
    percentageAmount: breakdown.percentageAmount,
    fixedFee: rule.fixedFee,
    minimumApplied: breakdown.minimumApplied,
    royaltyDue: breakdown.royaltyDue,
    currency: rule.currency,
    status: input.status ?? DEFAULT_STATUS,
    inputs: {
      salesReportId: salesReport.id,
      periodStart: salesReport.periodStart,
      periodEnd: salesReport.periodEnd,
      grossSales: salesReport.grossSales,
      refunds: salesReport.refunds,
      taxes: salesReport.taxes,
      excludedSales: salesReport.excludedSales,
      netSales: salesReport.netSales,
      currency: salesReport.currency,
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      ruleEffectiveFrom: rule.effectiveFrom,
      ruleEffectiveTo: rule.effectiveTo,
      ruleName: rule.name,
      excludedCategories: [...rule.excludedCategories],
    },
    calculation: {
      basis: rule.basis,
      reportedSales: breakdown.reportedSales,
      exclusions: breakdown.exclusions,
      royaltyBase: breakdown.royaltyBase,
      percentage: rule.percentage,
      percentageAmount: breakdown.percentageAmount,
      fixedFee: rule.fixedFee,
      minimum: breakdown.minimum,
      minimumApplied: breakdown.minimumApplied,
    },
    result: {
      royaltyDue: breakdown.royaltyDue,
      currency: rule.currency,
      minimumApplied: breakdown.minimumApplied,
      formula,
      ruleVersion: rule.ruleVersion,
    },
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  return calculation;
}

/** One-shot: select rule in force for the report period, then compute + build. */
export function computeRoyaltyForReport(input: {
  rules: readonly RoyaltyRule[];
  salesReport: SalesReportLike & { id: string };
  tenantId: string;
  unitId: string;
  id?: string;
  status?: RoyaltyCalculationStatus;
  createdAt?: string;
}): RoyaltyCalculation {
  const rule = selectRuleForPeriod(input.rules, input.salesReport.periodEnd);
  return buildRoyaltyCalculation({
    id: input.id,
    tenantId: input.tenantId,
    unitId: input.unitId,
    salesReport: input.salesReport,
    rule,
    status: input.status,
    createdAt: input.createdAt,
  });
}

function dayBefore(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

export type RoyaltyRulePatch = {
  name?: string;
  basis?: RoyaltyBasis;
  percentage?: number;
  minimumAmount?: MoneyAmount | null;
  fixedFee?: MoneyAmount | null;
  currency?: string;
  frequency?: RoyaltyFrequency;
  excludedCategories?: string[];
  taxTreatment?: TaxTreatment;
};

export type NextRuleVersionResult = { next: RoyaltyRule; superseded: RoyaltyRule };

/**
 * Creates the next version of a royalty rule and closes the previous one.
 * The new version's `effectiveFrom` must be strictly after the previous
 * version's `effectiveFrom`. History is never edited in place.
 */
export function createNextRuleVersion(
  prev: RoyaltyRule,
  patch: RoyaltyRulePatch & { effectiveFrom: string }
): NextRuleVersionResult {
  if (new Date(patch.effectiveFrom).getTime() <= new Date(prev.effectiveFrom).getTime()) {
    throw new Error(
      `next royalty rule version effectiveFrom must be later than ${prev.effectiveFrom}`
    );
  }
  const now = new Date().toISOString();
  const superseded: RoyaltyRule = {
    ...prev,
    effectiveTo: dayBefore(patch.effectiveFrom),
    updatedAt: now,
  };
  const next: RoyaltyRule = {
    id: prev.id,
    tenantId: prev.tenantId,
    name: patch.name ?? prev.name,
    version: prev.version + 1,
    basis: patch.basis ?? prev.basis,
    percentage: patch.percentage ?? prev.percentage,
    minimumAmount: patch.minimumAmount !== undefined ? patch.minimumAmount : prev.minimumAmount,
    fixedFee: patch.fixedFee !== undefined ? patch.fixedFee : prev.fixedFee,
    currency: patch.currency ?? prev.currency,
    frequency: patch.frequency ?? prev.frequency,
    excludedCategories: patch.excludedCategories ?? prev.excludedCategories,
    taxTreatment: patch.taxTreatment ?? prev.taxTreatment,
    effectiveFrom: patch.effectiveFrom,
    effectiveTo: null,
    createdAt: prev.createdAt,
    updatedAt: now,
  };
  return { next, superseded };
}
