import type { AgreementStatus, FranchiseAgreement } from './types.js';

export const DEFAULT_EXPIRY_WINDOWS_DAYS = [180, 90, 60, 30] as const;

export type ExpiryAlert = {
  agreementId: string;
  daysRemaining: number;
  windowDays: number;
};

const FROZEN: ReadonlySet<AgreementStatus> = new Set([
  'draft',
  'pending_signature',
  'terminated',
  'suspended',
]);

function utcDay(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00.000Z`);
}

export function daysUntilExpiration(expirationDate: string, nowIso: string): number {
  const nowDay = utcDay(nowIso.slice(0, 10));
  const end = utcDay(expirationDate);
  return Math.round((end - nowDay) / 86_400_000);
}

export function deriveAgreementStatus(
  agreement: Pick<FranchiseAgreement, 'status' | 'expirationDate'>,
  nowIso: string,
  expiringWithinDays = 90
): AgreementStatus {
  if (FROZEN.has(agreement.status)) {
    return agreement.status;
  }
  const remaining = daysUntilExpiration(agreement.expirationDate, nowIso);
  if (remaining < 0) return 'expired';
  if (remaining <= expiringWithinDays) return 'expiring';
  return 'active';
}

export function agreementExpiryAlerts(
  agreement: Pick<FranchiseAgreement, 'id' | 'status' | 'expirationDate'>,
  nowIso: string,
  windows: readonly number[] = DEFAULT_EXPIRY_WINDOWS_DAYS
): ExpiryAlert[] {
  if (agreement.status === 'draft' || agreement.status === 'terminated') {
    return [];
  }
  const remaining = daysUntilExpiration(agreement.expirationDate, nowIso);
  if (remaining < 0) return [];
  return windows
    .filter((windowDays) => remaining <= windowDays)
    .map((windowDays) => ({
      agreementId: agreement.id,
      daysRemaining: remaining,
      windowDays,
    }));
}

export function assertAgreementUnitsBelongToTenant(
  agreement: Pick<FranchiseAgreement, 'tenantId' | 'unitIds'>,
  unitTenantIds: ReadonlyMap<string, string>
): void {
  for (const unitId of agreement.unitIds) {
    const tenantId = unitTenantIds.get(unitId);
    if (tenantId !== agreement.tenantId) {
      throw new Error(`unit ${unitId} is not in agreement tenant`);
    }
  }
}
