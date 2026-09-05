/**
 * Pure derivation of the agreement board (status + expiry alerts) from
 * @intcloudsysops/franchise-core.
 *
 * Previously lived in lib/services/franchise-os.service.ts, which was removed
 * with the in-app Franchise OS aggregate. It is kept here because it is a pure
 * adapter with no DB or network access — the same contract as the rest of
 * lib/franchise/.
 */
import {
  agreementExpiryAlerts,
  deriveAgreementStatus,
  type FranchiseAgreement,
} from '@intcloudsysops/franchise-core';

export function agreementBoard(agreements: FranchiseAgreement[], nowIso: string) {
  return agreements.map((agreement) => ({
    agreement,
    derivedStatus: deriveAgreementStatus({
      state: agreement.state,
      effectiveDate: agreement.effectiveDate,
      expirationDate: agreement.expirationDate,
      noticeDays: agreement.noticeDays,
      now: nowIso,
    }),
    alerts: agreementExpiryAlerts({
      expirationDate: agreement.expirationDate,
      now: nowIso,
    }),
  }));
}
