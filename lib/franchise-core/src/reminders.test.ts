import { describe, expect, it } from 'vitest';
import { defaultOpeningTasks } from './opening.js';
import { reminderEvents } from './reminders.js';
import type { FranchiseAgreement, RoyaltyCalculation } from './types.js';

const NOW = '2026-08-20T12:00:00.000Z';

describe('franchise reminder contracts', () => {
  it('emits agreement expiring, royalty due/overdue, audit due, opening blockers', () => {
    const agreement: FranchiseAgreement = {
      id: 'ag-1',
      tenantId: 't',
      franchiseeId: 'f1',
      unitIds: ['u1'],
      status: 'active',
      effectiveDate: '2026-01-01',
      expirationDate: '2026-09-01',
      renewalType: 'none',
      renewalTermMonths: null,
      noticeDays: 90,
      canonicalFeeMinor: 0,
      currency: 'COP',
      royaltyRuleId: null,
      territoryId: null,
      documentRef: null,
      createdAt: NOW,
    };
    const due: RoyaltyCalculation = {
      id: 'c-due',
      tenantId: 't',
      unitId: 'u1',
      salesReportId: 's1',
      royaltyRuleId: 'r1',
      ruleVersion: 1,
      currency: 'COP',
      inputs: {
        basis: 'gross_sales',
        reportedSalesMinor: 100,
        excludedSalesMinor: 0,
        royaltyBaseMinor: 100,
        percentageBps: 500,
        fixedFeeMinor: 0,
        minimumAmountMinor: null,
        rounding: 'half_up',
      },
      royaltyDueMinor: 5,
      calculatedAt: '2026-08-19T00:00:00.000Z',
      idempotencyKey: 'k-due',
    };
    const overdue: RoyaltyCalculation = {
      ...due,
      id: 'c-over',
      calculatedAt: '2026-08-01T00:00:00.000Z',
      idempotencyKey: 'k-over',
    };
    const tasks = defaultOpeningTasks({ tenantId: 't', checklistId: 'cl-1' }).map((task) =>
      task.phase === 'contract' ? { ...task, dueDate: '2026-08-19' } : task
    );
    const events = reminderEvents({
      nowIso: NOW,
      agreements: [agreement],
      calculations: [due, overdue],
      payments: [],
      audits: [
        {
          id: 'a1',
          tenantId: 't',
          unitId: 'u1',
          templateId: 'tpl',
          templateVersion: 1,
          auditor: 'ops',
          scheduledAt: '2026-08-19T00:00:00.000Z',
          performedAt: null,
          score: null,
          status: 'scheduled',
        },
      ],
      checklists: [{ id: 'cl-1', tenantId: 't', unitId: 'u1', tasks }],
    });
    const names = events.map((event) => event.name);
    expect(names).toContain('agreement.expiring');
    expect(names).toContain('royalty.due');
    expect(names).toContain('royalty.overdue');
    expect(names).toContain('audit.due');
    expect(names).toContain('opening.blocked');
    expect(names).toContain('opening.task.due');
  });

  it('skips paid royalties and completed opening tasks', () => {
    const calc: RoyaltyCalculation = {
      id: 'c-paid',
      tenantId: 't',
      unitId: 'u1',
      salesReportId: 's1',
      royaltyRuleId: 'r1',
      ruleVersion: 1,
      currency: 'COP',
      inputs: {
        basis: 'gross_sales',
        reportedSalesMinor: 100,
        excludedSalesMinor: 0,
        royaltyBaseMinor: 100,
        percentageBps: 500,
        fixedFeeMinor: 0,
        minimumAmountMinor: null,
        rounding: 'half_up',
      },
      royaltyDueMinor: 5,
      calculatedAt: '2026-08-01T00:00:00.000Z',
      idempotencyKey: 'k-paid',
    };
    const events = reminderEvents({
      nowIso: NOW,
      calculations: [calc],
      payments: [
        {
          id: 'p1',
          tenantId: 't',
          calculationId: 'c-paid',
          amountMinor: 5,
          currency: 'COP',
          status: 'paid',
          method: 'manual',
          externalReference: null,
          paidAt: NOW,
        },
      ],
      checklists: [
        {
          id: 'cl',
          tenantId: 't',
          unitId: 'u1',
          tasks: defaultOpeningTasks({ tenantId: 't', checklistId: 'cl' }).map((task) => ({
            ...task,
            status: 'completed',
            dueDate: '2026-08-01',
          })),
        },
      ],
    });
    expect(events.map((event) => event.name)).toEqual([]);
  });
});
