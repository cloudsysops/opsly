import { describe, expect, it } from 'vitest';
import { agreementExpiryAlerts, deriveAgreementStatus } from './agreement.js';
import type { FranchiseAgreement } from './types.js';

const agreement: FranchiseAgreement = {
  id: 'ag-1',
  tenantId: 'tenant-a',
  franchiseeId: 'fe-1',
  unitIds: ['unit-1'],
  status: 'active',
  effectiveDate: '2026-01-01',
  expirationDate: '2026-10-01',
  renewalType: 'franchisor_discretion',
  renewalTermMonths: 60,
  noticeDays: 90,
  canonicalFeeMinor: 0,
  currency: 'COP',
  royaltyRuleId: 'rule-1',
  territoryId: 't-1',
  documentRef: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('agreements', () => {
  it('derives expiring and expired from dates without mutating frozen statuses', () => {
    expect(deriveAgreementStatus(agreement, '2026-08-15T00:00:00.000Z')).toBe('expiring');
    expect(deriveAgreementStatus(agreement, '2026-10-02T00:00:00.000Z')).toBe('expired');
    expect(deriveAgreementStatus({ ...agreement, status: 'terminated' }, '2026-10-02T00:00:00.000Z')).toBe(
      'terminated'
    );
  });

  it('emits configurable 180/90/60/30 windows', () => {
    const alerts = agreementExpiryAlerts(agreement, '2026-08-15T00:00:00.000Z');
    expect(alerts.map((a) => a.windowDays)).toEqual([180, 90, 60]);
    expect(alerts[0]?.daysRemaining).toBe(47);
  });
});
