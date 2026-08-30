import { describe, expect, it } from 'vitest';
import { assertAgreementRead, assertRoyaltyRead, assertRoyaltyWrite, assertUnitScope } from './authorize.js';
import { FranchisePersistenceError } from './errors.js';
import type { FranchiseActor } from './actor.js';

const base: FranchiseActor = {
  tenantId: 't-a',
  tenantSlug: 'peskids',
  actorId: 'u1',
  role: 'franchise_admin',
  assignedUnitIds: ['unit-a'],
  requestId: 'r1',
};

describe('franchise persistence authorize', () => {
  it('denies teacher financial reads/writes', () => {
    expect(() => assertRoyaltyRead('teacher')).toThrow(FranchisePersistenceError);
    expect(() => assertRoyaltyWrite('teacher')).toThrow(FranchisePersistenceError);
    expect(() => assertAgreementRead('teacher')).toThrow(FranchisePersistenceError);
  });

  it('denies auditor agreement and royalty access', () => {
    expect(() => assertRoyaltyRead('auditor')).toThrow(FranchisePersistenceError);
    expect(() => assertAgreementRead('auditor')).toThrow(FranchisePersistenceError);
  });

  it('enforces unit scope for franchise admins', () => {
    expect(() => assertUnitScope(base, 'unit-b')).toThrow(/unit_isolation/);
    expect(() => assertUnitScope(base, 'unit-a')).not.toThrow();
    expect(() =>
      assertUnitScope({ ...base, role: 'franchise_network_admin', assignedUnitIds: [] }, 'unit-b')
    ).not.toThrow();
  });
});
