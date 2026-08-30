import { describe, expect, it } from 'vitest';
import {
  agreementExpiryAlerts,
  agreementOperationalStatus,
  canTransitionAgreement,
  deriveAgreementStatus,
  expirationDateFromTerm,
  noticeCompliant,
} from '../src/agreement.js';
import type { FranchiseAgreement } from '../src/types.js';

function agreement(overrides: Partial<FranchiseAgreement> = {}): FranchiseAgreement {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: 'peskids',
    franchiseeId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    unitIds: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
    state: 'active',
    effectiveDate: '2026-01-01T00:00:00.000Z',
    expirationDate: '2028-01-01T00:00:00.000Z',
    renewalType: 'auto',
    noticeDays: 90,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('canTransitionAgreement', () => {
  it('follows the documented state machine', () => {
    expect(canTransitionAgreement('draft', 'pending_signature')).toBe(true);
    expect(canTransitionAgreement('pending_signature', 'active')).toBe(true);
    expect(canTransitionAgreement('active', 'suspended')).toBe(true);
    expect(canTransitionAgreement('suspended', 'active')).toBe(true);
    expect(canTransitionAgreement('active', 'terminated')).toBe(true);
    expect(canTransitionAgreement('terminated', 'active')).toBe(false);
    expect(canTransitionAgreement('expired', 'active')).toBe(false);
  });
});

describe('deriveAgreementStatus', () => {
  const now = '2026-06-01T00:00:00.000Z';

  it('keeps controlled states unchanged', () => {
    expect(
      deriveAgreementStatus({
        state: 'draft',
        effectiveDate: '2026-01-01T00:00:00.000Z',
        expirationDate: '2028-01-01T00:00:00.000Z',
        noticeDays: 90,
        now,
      })
    ).toBe('draft');
    expect(
      deriveAgreementStatus({
        state: 'terminated',
        effectiveDate: '2026-01-01T00:00:00.000Z',
        expirationDate: '2028-01-01T00:00:00.000Z',
        noticeDays: 90,
        now,
      })
    ).toBe('terminated');
  });

  it('reports active when far from expiry', () => {
    expect(
      deriveAgreementStatus({
        state: 'active',
        effectiveDate: '2026-01-01T00:00:00.000Z',
        expirationDate: '2028-01-01T00:00:00.000Z',
        noticeDays: 90,
        now,
      })
    ).toBe('active');
  });

  it('reports expiring inside the notice window', () => {
    const expiration = '2026-07-01T00:00:00.000Z';
    const inside = deriveAgreementStatus({
      state: 'active',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      expirationDate: expiration,
      noticeDays: 90,
      now: '2026-06-01T00:00:00.000Z',
    });
    expect(inside).toBe('expiring');
  });

  it('reports expired past expiration', () => {
    const status = deriveAgreementStatus({
      state: 'active',
      effectiveDate: '2026-01-01T00:00:00.000Z',
      expirationDate: '2026-05-01T00:00:00.000Z',
      noticeDays: 90,
      now,
    });
    expect(status).toBe('expired');
  });
});

describe('agreementExpiryAlerts', () => {
  const now = '2026-08-01T00:00:00.000Z';

  it('returns no alerts far from expiry', () => {
    expect(agreementExpiryAlerts({ expirationDate: '2028-01-01T00:00:00.000Z', now })).toEqual([]);
  });

  it('returns only the crossed thresholds sorted ascending', () => {
    const alerts = agreementExpiryAlerts({ expirationDate: '2026-08-31T00:00:00.000Z', now });
    expect(alerts.map((a) => a.thresholdDays)).toEqual([30]);
    expect(alerts[0].level).toBe('critical');
  });

  it('honours custom thresholds', () => {
    const alerts = agreementExpiryAlerts({
      expirationDate: '2026-08-26T00:00:00.000Z',
      now,
      thresholds: [120, 60, 15],
    });
    expect(alerts.map((a) => a.thresholdDays)).toEqual([60]);
    expect(alerts[0].level).toBe('warning');
  });

  it('returns empty for an already-expired agreement', () => {
    expect(agreementExpiryAlerts({ expirationDate: '2026-01-01T00:00:00.000Z', now })).toEqual([]);
  });
});

describe('noticeCompliant', () => {
  it('accepts notice given before the notice window ends', () => {
    const result = noticeCompliant({
      noticeAt: '2027-10-01T00:00:00.000Z',
      expirationDate: '2028-01-01T00:00:00.000Z',
      noticeDays: 90,
    });
    expect(result.compliant).toBe(true);
    expect(result.daysOfNotice).toBeGreaterThanOrEqual(90);
  });

  it('rejects late notice', () => {
    const result = noticeCompliant({
      noticeAt: '2027-12-15T00:00:00.000Z',
      expirationDate: '2028-01-01T00:00:00.000Z',
      noticeDays: 90,
    });
    expect(result.compliant).toBe(false);
  });
});

describe('expirationDateFromTerm + agreementOperationalStatus', () => {
  it('projects expiration from effective date and term', () => {
    const exp = expirationDateFromTerm({
      effectiveDate: '2026-01-15T00:00:00.000Z',
      termMonths: 12,
    });
    expect(new Date(exp).getUTCFullYear()).toBe(2027);
  });

  it('ties stored state with derived status', () => {
    const a = agreement({ expirationDate: '2026-09-01T00:00:00.000Z' });
    expect(agreementOperationalStatus(a, '2026-08-01T00:00:00.000Z')).toBe('expiring');
  });
});
