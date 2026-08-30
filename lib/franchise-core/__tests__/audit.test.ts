import { describe, expect, it } from 'vitest';
import type { CorrectiveAction } from '../src/types.js';
import {
  canTransitionAudit,
  canTransitionCorrectiveAction,
  correctiveActionCounts,
  correctiveActionOperationalStatus,
  effectiveAuditStatus,
  effectiveCorrectiveActionStatus,
  scoreFromFindings,
} from '../src/audit.js';

function action(overrides: Partial<CorrectiveAction> = {}): CorrectiveAction {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    tenantId: 'peskids',
    findingId: '44444444-4444-4444-8444-444444444444',
    unitId: '22222222-2222-4222-8222-222222222222',
    dueDate: '2026-09-01T00:00:00.000Z',
    status: 'open',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('audit transitions', () => {
  it('follows the audit state machine', () => {
    expect(canTransitionAudit('scheduled', 'in_progress')).toBe(true);
    expect(canTransitionAudit('in_progress', 'completed')).toBe(true);
    expect(canTransitionAudit('completed', 'in_progress')).toBe(false);
    expect(canTransitionAudit('scheduled', 'cancelled')).toBe(true);
  });

  it('derives overdue for a scheduled audit past its date', () => {
    expect(
      effectiveAuditStatus({
        status: 'scheduled',
        scheduledAt: '2026-08-01T00:00:00.000Z',
        now: '2026-08-05T00:00:00.000Z',
      })
    ).toBe('overdue');
    expect(
      effectiveAuditStatus({
        status: 'scheduled',
        scheduledAt: '2026-08-01T00:00:00.000Z',
        now: '2026-08-01T06:00:00.000Z',
      })
    ).toBe('scheduled');
  });
});

describe('corrective actions', () => {
  it('follows the corrective-action state machine', () => {
    expect(canTransitionCorrectiveAction('open', 'in_progress')).toBe(true);
    expect(canTransitionCorrectiveAction('in_progress', 'resolved')).toBe(true);
    expect(canTransitionCorrectiveAction('resolved', 'verified')).toBe(true);
    expect(canTransitionCorrectiveAction('verified', 'open')).toBe(false);
    expect(canTransitionCorrectiveAction('overdue', 'in_progress')).toBe(true);
  });

  it('derives overdue past due date', () => {
    expect(
      effectiveCorrectiveActionStatus({
        status: 'open',
        dueDate: '2026-09-01T00:00:00.000Z',
        now: '2026-09-10T00:00:00.000Z',
      })
    ).toBe('overdue');
    expect(
      effectiveCorrectiveActionStatus({
        status: 'open',
        dueDate: '2026-09-01T00:00:00.000Z',
        now: '2026-08-20T00:00:00.000Z',
      })
    ).toBe('open');
    expect(
      effectiveCorrectiveActionStatus({
        status: 'resolved',
        dueDate: '2026-09-01T00:00:00.000Z',
        now: '2026-09-10T00:00:00.000Z',
      })
    ).toBe('resolved');
  });

  it('counts by derived status', () => {
    const now = '2026-09-10T00:00:00.000Z';
    const counts = correctiveActionCounts(
      [
        action(),
        action({ dueDate: '2026-09-01T00:00:00.000Z' }),
        action({ status: 'resolved' }),
        action({ status: 'verified' }),
      ],
      now
    );
    expect(counts.overdue).toBe(2);
    expect(counts.resolved).toBe(1);
    expect(counts.verified).toBe(1);
  });
});

describe('scoreFromFindings', () => {
  it('returns 100 with no findings', () => {
    expect(scoreFromFindings([]).score).toBe(100);
  });

  it('zeros the score on a critical finding', () => {
    const result = scoreFromFindings([{ severity: 'critical' }, { severity: 'minor' }]);
    expect(result.score).toBe(0);
    expect(result.criticalCount).toBe(1);
  });

  it('weights major/minor/info without criticals', () => {
    const result = scoreFromFindings([
      { severity: 'major' },
      { severity: 'minor' },
      { severity: 'info' },
    ]);
    expect(result.score).toBe(round100th((0.5 + 0.8 + 1) / 3));
  });

  it('keeps operational status helper aligned', () => {
    expect(
      correctiveActionOperationalStatus(
        action({ dueDate: '2026-08-01T00:00:00.000Z' }),
        '2026-09-01T00:00:00.000Z'
      )
    ).toBe('overdue');
  });
});

function round100th(v: number): number {
  return Math.round(v * 1000) / 10;
}
