import { describe, expect, it } from 'vitest';
import { assertCandidateTransition, canTransitionCandidate } from '../candidate-domain';
import { canAccessCandidateCrm } from '../candidate-service';

const session = (roles: Array<'owner' | 'admin' | 'support' | 'teacher'>) => ({
  userId: 'user-1',
  tenantSlug: 'peskids' as const,
  roles,
  franchiseUnitIds: ['unit-1'],
  permissions: ['franchise.units:read'],
});

describe('franchise candidate pipeline', () => {
  it('allows only adjacent forward transitions', () => {
    expect(canTransitionCandidate('lead', 'qualified')).toBe(true);
    expect(canTransitionCandidate('lead', 'active')).toBe(false);
    expect(() => assertCandidateTransition('financial_review', 'active')).toThrow();
  });

  it('limits candidate access by role', () => {
    expect(canAccessCandidateCrm(session(['owner']), 'approve')).toBe(true);
    expect(canAccessCandidateCrm(session(['support']), 'read')).toBe(true);
    expect(canAccessCandidateCrm(session(['support']), 'approve')).toBe(false);
    expect(canAccessCandidateCrm(session(['teacher']), 'read')).toBe(false);
  });
});
