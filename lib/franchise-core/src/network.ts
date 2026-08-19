import type {
  CorrectiveAction,
  FranchiseAgreement,
  FranchiseUnit,
  RoyaltyCalculation,
  RoyaltyPayment,
} from './types.js';
import { deriveAgreementStatus } from './agreement.js';
import { deriveCorrectiveActionStatus } from './audit.js';

export type NetworkDashboard = {
  unitsTotal: number;
  active: number;
  opening: number;
  suspended: number;
  royaltiesDueMinor: number;
  royaltiesPaidMinor: number;
  royaltiesOverdueCount: number;
  agreementsExpiring: number;
  correctiveActionsOverdue: number;
  openingPipeline: number;
};

export function summarizeNetwork(input: {
  nowIso: string;
  units: readonly FranchiseUnit[];
  calculations: readonly RoyaltyCalculation[];
  payments: readonly RoyaltyPayment[];
  agreements: readonly FranchiseAgreement[];
  correctiveActions: readonly CorrectiveAction[];
}): NetworkDashboard {
  const paidByCalc = new Map<string, number>();
  for (const payment of input.payments) {
    if (payment.status === 'paid') {
      paidByCalc.set(payment.calculationId, (paidByCalc.get(payment.calculationId) ?? 0) + payment.amountMinor);
    }
  }
  let royaltiesDueMinor = 0;
  let royaltiesPaidMinor = 0;
  let royaltiesOverdueCount = 0;
  for (const calc of input.calculations) {
    const paid = paidByCalc.get(calc.id) ?? 0;
    royaltiesPaidMinor += paid;
    const remaining = Math.max(0, calc.royaltyDueMinor - paid);
    royaltiesDueMinor += remaining;
    if (remaining > 0) royaltiesOverdueCount += 1;
  }
  const agreementsExpiring = input.agreements.filter(
    (a) => deriveAgreementStatus(a, input.nowIso) === 'expiring'
  ).length;
  return {
    unitsTotal: input.units.length,
    active: input.units.filter((u) => u.status === 'active').length,
    opening: input.units.filter((u) => u.status === 'opening').length,
    suspended: input.units.filter((u) => u.status === 'suspended' || u.status === 'paused').length,
    royaltiesDueMinor,
    royaltiesPaidMinor,
    royaltiesOverdueCount,
    agreementsExpiring,
    correctiveActionsOverdue: input.correctiveActions.filter(
      (a) => deriveCorrectiveActionStatus(a, input.nowIso) === 'overdue'
    ).length,
    openingPipeline: input.units.filter((u) => u.status === 'opening' || u.status === 'approved').length,
  };
}
