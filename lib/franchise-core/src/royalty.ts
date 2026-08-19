import { applyBpsHalfUp, assertBps, assertMinor } from './money.js';
import type {
  RoyaltyCalculation,
  RoyaltyCalculationInputs,
  RoyaltyRule,
  SalesReport,
} from './types.js';

export class RoyaltyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoyaltyError';
  }
}

export function royaltyIdempotencyKey(input: {
  tenantId: string;
  salesReportId: string;
  royaltyRuleId: string;
  ruleVersion: number;
}): string {
  return `${input.tenantId}:${input.salesReportId}:${input.royaltyRuleId}:v${input.ruleVersion}`;
}

export function reportedSalesMinor(rule: RoyaltyRule, report: SalesReport): number {
  if (rule.basis === 'gross_sales') {
    return report.grossSalesMinor;
  }
  return report.netSalesMinor;
}

export function buildRoyaltyInputs(rule: RoyaltyRule, report: SalesReport): RoyaltyCalculationInputs {
  if (rule.tenantId !== report.tenantId) {
    throw new RoyaltyError('rule and sales report tenantId must match');
  }
  if (rule.currency !== report.currency) {
    throw new RoyaltyError('rule and sales report currency must match');
  }
  assertBps(rule.percentageBps);
  const reported = assertMinor(reportedSalesMinor(rule, report), 'reportedSales');
  const excluded = assertMinor(report.excludedSalesMinor, 'excludedSales');
  const royaltyBaseMinor = Math.max(0, reported - excluded);
  return {
    basis: rule.basis,
    reportedSalesMinor: reported,
    excludedSalesMinor: excluded,
    royaltyBaseMinor,
    percentageBps: rule.percentageBps,
    fixedFeeMinor: rule.fixedFeeMinor ?? 0,
    minimumAmountMinor: rule.minimumAmountMinor,
    rounding: 'half_up',
  };
}

export function royaltyDueFromInputs(inputs: RoyaltyCalculationInputs): number {
  const percentDue = applyBpsHalfUp(inputs.royaltyBaseMinor, inputs.percentageBps);
  const withFixed = percentDue + assertMinor(inputs.fixedFeeMinor, 'fixedFee');
  if (inputs.minimumAmountMinor == null) {
    return withFixed;
  }
  const minimum = assertMinor(inputs.minimumAmountMinor, 'minimumAmount');
  return Math.max(withFixed, minimum);
}

export function calculateRoyalty(input: {
  id: string;
  rule: RoyaltyRule;
  report: SalesReport;
  unitId: string;
  calculatedAt: string;
}): RoyaltyCalculation {
  const inputs = buildRoyaltyInputs(input.rule, input.report);
  const royaltyDueMinor = royaltyDueFromInputs(inputs);
  const idempotencyKey = royaltyIdempotencyKey({
    tenantId: input.rule.tenantId,
    salesReportId: input.report.id,
    royaltyRuleId: input.rule.id,
    ruleVersion: input.rule.version,
  });
  return Object.freeze({
    id: input.id,
    tenantId: input.rule.tenantId,
    unitId: input.unitId,
    salesReportId: input.report.id,
    royaltyRuleId: input.rule.id,
    ruleVersion: input.rule.version,
    currency: input.rule.currency,
    inputs: Object.freeze({ ...inputs }),
    royaltyDueMinor,
    calculatedAt: input.calculatedAt,
    idempotencyKey,
  });
}

/**
 * Historical calculations are snapshots. Changing a rule later must not
 * rewrite an existing calculation — persist a new version instead.
 */
export function assertCalculationImmutable(
  existing: RoyaltyCalculation,
  next: RoyaltyCalculation
): void {
  if (existing.idempotencyKey !== next.idempotencyKey) {
    return;
  }
  if (
    existing.royaltyDueMinor !== next.royaltyDueMinor ||
    existing.ruleVersion !== next.ruleVersion ||
    existing.inputs.percentageBps !== next.inputs.percentageBps ||
    existing.inputs.royaltyBaseMinor !== next.inputs.royaltyBaseMinor
  ) {
    throw new RoyaltyError(
      'Cannot mutate a historical royalty calculation; create a new rule version'
    );
  }
}

export function nextRoyaltyRuleVersion(current: RoyaltyRule, patch: Partial<RoyaltyRule>): RoyaltyRule {
  const next: RoyaltyRule = {
    ...current,
    ...patch,
    id: current.id,
    tenantId: current.tenantId,
    version: current.version + 1,
  };
  if (next.version === current.version) {
    throw new RoyaltyError('rule version must increase');
  }
  return next;
}
