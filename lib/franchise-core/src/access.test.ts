import { describe, expect, it } from 'vitest';
import { canAccessUnit, canReadAgreements, canReadRoyalties, canWriteFinancial, mapTenantStaffRole } from './access.js';

describe('access control', () => {
  it('blocks tenant crossover and teachers on royalties', () => {
    expect(canReadRoyalties('teacher').allow).toBe(false);
    expect(canReadRoyalties('tenant_owner').allow).toBe(true);
    expect(
      canAccessUnit({
        role: 'franchise_admin',
        tenantId: 'a',
        resourceTenantId: 'b',
        unitId: 'u1',
        assignedUnitIds: ['u1'],
      }).allow
    ).toBe(false);
    expect(
      canAccessUnit({
        role: 'franchise_admin',
        tenantId: 'a',
        resourceTenantId: 'a',
        unitId: 'u2',
        assignedUnitIds: ['u1'],
      }).allow
    ).toBe(false);
    expect(mapTenantStaffRole('owner')).toBe('tenant_owner');
    expect(canReadAgreements('teacher').allow).toBe(false);
    expect(canReadAgreements('auditor').allow).toBe(false);
    expect(canWriteFinancial('teacher').allow).toBe(false);
    expect(canWriteFinancial('franchise_network_admin').allow).toBe(true);
  });
});
