// Design spec for units.ts/opening.ts/network.ts and audit.ts helpers
// (deriveCorrectiveActionStatus, scoreAudit) that were never implemented.
// Excluded from tsc/vitest (see tsconfig.json / vitest.config.ts) until
// those modules exist. Runnable ACL coverage lives in access.test.ts.
import { describe, expect, it } from 'vitest';
import { assertFranchiseeDistinctFromUnit, ownedUnitDefaults, UnitModelError } from './units.js';
import { canActivateUnit, defaultOpeningTasks } from './opening.js';
import { deriveCorrectiveActionStatus, scoreAudit } from './audit.js';
import { summarizeNetwork } from './network.js';
import type { AuditTemplate, Franchisee } from './types.js';

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
      primaryContact: { name: 'x', email: 'x@y.z', phone: null },
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(() => assertFranchiseeDistinctFromUnit(franchisee, unit)).toThrow(UnitModelError);
  });
});

describe('opening + audits + network', () => {
  it('blocks activation until required opening tasks complete', () => {
    const tasks = defaultOpeningTasks({ tenantId: 't', checklistId: 'c1' });
    expect(canActivateUnit({ id: 'c1', tenantId: 't', unitId: 'u1', tasks })).toBe(false);
    const done = tasks.map((task) => ({ ...task, status: 'completed' as const }));
    expect(canActivateUnit({ id: 'c1', tenantId: 't', unitId: 'u1', tasks: done })).toBe(true);
  });

  it('scores audits and marks overdue corrective actions', () => {
    const template: AuditTemplate = {
      id: 'tpl',
      tenantId: 't',
      name: 'Quality',
      version: 1,
      questions: [
        { id: 'q1', section: 'safety', prompt: 'Safe', weight: 1, criticalFailure: true, standardCode: 'S1' },
        { id: 'q2', section: 'brand', prompt: 'Brand', weight: 1, criticalFailure: false, standardCode: null },
      ],
    };
    expect(scoreAudit(template, new Map([['q1', 1], ['q2', 0]]))).toBe(50);
    expect(deriveCorrectiveActionStatus({ status: 'open', dueDate: '2026-08-01' }, '2026-08-18')).toBe('overdue');
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
    expect(summary.royaltiesDueMinor).toBe(0);
  });
});
