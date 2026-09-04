import { describe, expect, it } from 'vitest';
import { canAccessUnit, canReadAgreements, canReadRoyalties, canWriteFinancial, mapTenantStaffRole } from './access.js';
import { assertFranchiseeDistinctFromUnit, ownedUnitDefaults, UnitModelError } from './units.js';
import { canActivateUnit, defaultOpeningTasks } from './opening.js';
import { effectiveCorrectiveActionStatus, scoreFromFindings } from './audit.js';
import { summarizeNetwork } from './network.js';
import type { Franchisee } from './types.js';

describe('franchisee vs unit', () => {
  it('keeps owned units without a franchisee and forbids id collision', () => {
    const unit = ownedUnitDefaults({
      id: 'unit-1',
      tenantId: 't',
      networkId: 'n',
      code: 'llanogrande-principal',
      name: 'Llanogrande',
      type: 'flagship',
      legacyOperatingId: 'legacy-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(unit.franchiseeId).toBeNull();
    const franchisee: Franchisee = {
      id: 'unit-1',
      tenantId: 't',
      legalName: 'Wrong',
      taxId: null,
      status: 'active',
      primaryContact: { name: 'x', email: 'x@y.z' },
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(() => assertFranchiseeDistinctFromUnit(franchisee, unit)).toThrow(UnitModelError);
  });
});

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

describe('opening + audits + network', () => {
  it('blocks activation until required opening tasks complete', () => {
    const tasks = defaultOpeningTasks({ tenantId: 't', checklistId: 'c1', unitId: 'u1' });
    expect(canActivateUnit({ tasks })).toBe(false);
    const done = tasks.map((task) => ({ ...task, status: 'done' as const }));
    expect(canActivateUnit({ tasks: done })).toBe(true);
  });

  it('scores audits and marks overdue corrective actions', () => {
    expect(scoreFromFindings([{ severity: 'major' }, { severity: 'minor' }]).score).toBe(65);
    expect(effectiveCorrectiveActionStatus({ status: 'open', dueDate: '2026-08-01', now: '2026-08-18' })).toBe('overdue');
  });

  it('summarizes network from real collections only', () => {
    const unit = ownedUnitDefaults({
      id: 'u1',
      tenantId: 't',
      networkId: 'n',
      code: 'x',
      name: 'X',
      type: 'owned',
      legacyOperatingId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const summary = summarizeNetwork({
      nowIso: '2026-08-18T00:00:00.000Z',
      units: [unit],
      calculations: [],
      payments: [],
      agreements: [],
      correctiveActions: [],
    });
    expect(summary.unitsTotal).toBe(1);
    expect(summary.active).toBe(1);
    expect(summary.royaltiesDue).toBe(0);
  });
});
