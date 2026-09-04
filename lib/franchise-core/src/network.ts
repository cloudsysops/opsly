import type { CorrectiveAction, FranchiseAgreement, FranchiseUnit, RoyaltyCalculation, RoyaltyPayment } from './types.js';
import { agreementOperationalStatus } from './agreement.js';
import { correctiveActionOperationalStatus } from './audit.js';

export type NetworkDashboard = { unitsTotal: number; active: number; opening: number; suspended: number; royaltiesDue: number; royaltiesPaid: number; royaltiesOverdueCount: number; agreementsExpiring: number; correctiveActionsOverdue: number; openingPipeline: number };

export function summarizeNetwork(input: { nowIso: string; units: readonly FranchiseUnit[]; calculations: readonly RoyaltyCalculation[]; payments: readonly RoyaltyPayment[]; agreements: readonly FranchiseAgreement[]; correctiveActions: readonly CorrectiveAction[] }): NetworkDashboard {
  const paid = new Map<string, number>();
  for (const payment of input.payments) if (payment.status === 'paid') paid.set(payment.calculationId, (paid.get(payment.calculationId) ?? 0) + payment.amount);
  let royaltiesDue = 0; let royaltiesPaid = 0; let royaltiesOverdueCount = 0;
  for (const calculation of input.calculations) {
    const paidAmount = paid.get(calculation.id) ?? 0;
    royaltiesPaid += paidAmount;
    royaltiesDue += Math.max(0, calculation.royaltyDue - paidAmount);
    if (calculation.royaltyDue > paidAmount) royaltiesOverdueCount += 1;
  }
  return {
    unitsTotal: input.units.length,
    active: input.units.filter((unit) => unit.status === 'active').length,
    opening: input.units.filter((unit) => unit.status === 'opening').length,
    suspended: input.units.filter((unit) => unit.status === 'suspended').length,
    royaltiesDue, royaltiesPaid, royaltiesOverdueCount,
    agreementsExpiring: input.agreements.filter((agreement) => agreementOperationalStatus(agreement, input.nowIso) === 'expiring').length,
    correctiveActionsOverdue: input.correctiveActions.filter((action) => correctiveActionOperationalStatus(action, input.nowIso) === 'overdue').length,
    openingPipeline: input.units.filter((unit) => unit.status === 'opening' || unit.status === 'approved').length,
  };
}
