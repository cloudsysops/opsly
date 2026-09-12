import { agreementExpiryAlerts } from './agreement.js';
import { FRANCHISE_EVENTS, franchiseEvent, type FranchiseEvent } from './events.js';
import { canActivateUnit, openingBlockers } from './opening.js';
import { supplierBlocksProcurement, supportSlaBreached, trainingCompletionExpired } from './ops.js';
import type {
  Audit,
  FranchiseAgreement,
  OpeningChecklist,
  RoyaltyCalculation,
  RoyaltyPayment,
  Supplier,
  SupportCase,
  TrainingCompletion,
} from './types.js';

const MS_PER_DAY = 86_400_000;
const ROYALTY_OVERDUE_AFTER_DAYS = 7;

export type ReminderInputs = {
  nowIso: string;
  agreements?: readonly FranchiseAgreement[];
  calculations?: readonly RoyaltyCalculation[];
  payments?: readonly RoyaltyPayment[];
  audits?: readonly Audit[];
  checklists?: readonly OpeningChecklist[];
  suppliers?: readonly Supplier[];
  trainingCompletions?: readonly TrainingCompletion[];
  supportCases?: readonly SupportCase[];
};

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${dateOnly(fromIso)}T00:00:00.000Z`);
  const to = Date.parse(`${dateOnly(toIso)}T00:00:00.000Z`);
  return Math.round((to - from) / MS_PER_DAY);
}

function paidCalculationIds(payments: readonly RoyaltyPayment[]): Set<string> {
  return new Set(payments.filter((row) => row.status === 'paid').map((row) => row.calculationId));
}

function agreementReminders(nowIso: string, agreements: readonly FranchiseAgreement[]): FranchiseEvent[] {
  const events: FranchiseEvent[] = [];
  for (const agreement of agreements) {
    const alerts = agreementExpiryAlerts(agreement, nowIso);
    if (alerts.length === 0) continue;
    const nearest = alerts.reduce((acc, alert) => (alert.windowDays < acc.windowDays ? alert : acc));
    events.push(
      franchiseEvent(FRANCHISE_EVENTS.agreementExpiring, {
        tenantId: agreement.tenantId,
        unitId: agreement.unitIds[0] ?? null,
        occurredAt: nowIso,
        payload: {
          agreementId: agreement.id,
          daysRemaining: nearest.daysRemaining,
          windowDays: nearest.windowDays,
        },
      })
    );
  }
  return events;
}

function royaltyReminders(
  nowIso: string,
  calculations: readonly RoyaltyCalculation[],
  payments: readonly RoyaltyPayment[]
): FranchiseEvent[] {
  const paid = paidCalculationIds(payments);
  const events: FranchiseEvent[] = [];
  for (const calc of calculations) {
    if (paid.has(calc.id)) continue;
    const overdue = daysBetween(calc.calculatedAt, nowIso) >= ROYALTY_OVERDUE_AFTER_DAYS;
    events.push(
      franchiseEvent(overdue ? FRANCHISE_EVENTS.royaltyOverdue : FRANCHISE_EVENTS.royaltyDue, {
        tenantId: calc.tenantId,
        unitId: calc.unitId,
        occurredAt: nowIso,
        payload: { calculationId: calc.id, royaltyDueMinor: calc.royaltyDueMinor },
      })
    );
  }
  return events;
}

function auditReminders(nowIso: string, audits: readonly Audit[]): FranchiseEvent[] {
  return audits
    .filter((audit) => audit.status === 'scheduled' && audit.scheduledAt <= nowIso)
    .map((audit) =>
      franchiseEvent(FRANCHISE_EVENTS.auditDue, {
        tenantId: audit.tenantId,
        unitId: audit.unitId,
        occurredAt: nowIso,
        payload: { auditId: audit.id, scheduledAt: audit.scheduledAt },
      })
    );
}

function openingReminders(nowIso: string, checklists: readonly OpeningChecklist[]): FranchiseEvent[] {
  const today = dateOnly(nowIso);
  const events: FranchiseEvent[] = [];
  for (const checklist of checklists) {
    if (!canActivateUnit(checklist)) {
      events.push(
        franchiseEvent(FRANCHISE_EVENTS.openingBlocked, {
          tenantId: checklist.tenantId,
          unitId: checklist.unitId,
          occurredAt: nowIso,
          payload: { checklistId: checklist.id, blockerCount: openingBlockers(checklist).length },
        })
      );
    }
    for (const task of checklist.tasks) {
      if (!task.dueDate) continue;
      if (task.status === 'completed' || task.status === 'skipped') continue;
      if (task.dueDate > today) continue;
      events.push(
        franchiseEvent(FRANCHISE_EVENTS.openingTaskDue, {
          tenantId: checklist.tenantId,
          unitId: checklist.unitId,
          occurredAt: nowIso,
          payload: { checklistId: checklist.id, taskId: task.id, phase: task.phase },
        })
      );
    }
  }
  return events;
}

function supplierReminders(nowIso: string, suppliers: readonly Supplier[]): FranchiseEvent[] {
  return suppliers
    .filter(supplierBlocksProcurement)
    .map((supplier) =>
      franchiseEvent(FRANCHISE_EVENTS.supplierSuspended, {
        tenantId: supplier.tenantId,
        unitId: null,
        occurredAt: nowIso,
        payload: { supplierId: supplier.id, status: supplier.status },
      })
    );
}

function trainingReminders(nowIso: string, rows: readonly TrainingCompletion[]): FranchiseEvent[] {
  return rows
    .filter((row) => trainingCompletionExpired(row, nowIso))
    .map((row) =>
      franchiseEvent(FRANCHISE_EVENTS.trainingExpired, {
        tenantId: row.tenantId,
        unitId: row.unitId,
        occurredAt: nowIso,
        payload: { completionId: row.id, requirementId: row.requirementId },
      })
    );
}

function supportReminders(nowIso: string, rows: readonly SupportCase[]): FranchiseEvent[] {
  return rows
    .filter((row) => supportSlaBreached(row, nowIso))
    .map((row) =>
      franchiseEvent(FRANCHISE_EVENTS.supportSlaBreached, {
        tenantId: row.tenantId,
        unitId: row.unitId,
        occurredAt: nowIso,
        payload: { caseId: row.id, slaHours: row.slaHours ?? 0 },
      })
    );
}

/** Domain reminder contracts only. Does not send email, Discord, or n8n. */
export function reminderEvents(input: ReminderInputs): FranchiseEvent[] {
  return [
    ...agreementReminders(input.nowIso, input.agreements ?? []),
    ...royaltyReminders(input.nowIso, input.calculations ?? [], input.payments ?? []),
    ...auditReminders(input.nowIso, input.audits ?? []),
    ...openingReminders(input.nowIso, input.checklists ?? []),
    ...supplierReminders(input.nowIso, input.suppliers ?? []),
    ...trainingReminders(input.nowIso, input.trainingCompletions ?? []),
    ...supportReminders(input.nowIso, input.supportCases ?? []),
  ];
}
