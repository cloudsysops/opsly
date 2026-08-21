import {
  applyOpeningTaskProgress,
  assembleOpeningChecklist,
  calculateRoyalty,
  canActivateUnit,
  defaultOpeningTasks,
  findTerritoryConflicts,
  FRANCHISE_EVENTS,
  franchiseEvent,
  nextRoyaltyRuleVersion,
  openingBlockers,
  reminderEvents,
  type DocumentReference,
  type OpeningChecklist,
  type RoyaltyRule,
  type SalesReport,
  type TaskStatus,
} from '@intcloudsysops/franchise-core';
import type { FranchiseActor } from './actor.js';
import {
  assertAgreementRead,
  assertAuditRead,
  assertOpeningRead,
  assertOpeningWrite,
  assertRoyaltyRead,
  assertRoyaltyWrite,
  assertUnitScope,
} from './authorize.js';
import { FranchisePersistenceError } from './errors.js';
import type { FranchiseStore, NewAgreement, NewAudit, NewSalesReport, NewTerritory } from './store.js';

export function createFranchiseService(store: FranchiseStore) {
  return {
    async requireSchema(): Promise<void> {
      const ok = await store.probeSchema();
      if (!ok) {
        throw new FranchisePersistenceError(
          'FRANCHISE_SCHEMA_NOT_AVAILABLE',
          'Franchise OS schema is not applied in this environment',
          503
        );
      }
    },

    async createTerritory(actor: FranchiseActor, input: NewTerritory) {
      await this.requireSchema();
      assertRoyaltyWrite(actor.role);
      if (input.unitId) assertUnitScope(actor, input.unitId);
      const existing = await store.listTerritories(actor);
      const next = {
        ...input,
        id: 'pending',
        status: input.status ?? 'active',
      };
      const conflicts = findTerritoryConflicts([...existing, next]);
      const created = await store.insertTerritory(actor, input);
      await store.insertChangeLog({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        entity: 'territory',
        entityId: created.id,
        action: 'create',
        before: null,
        after: created,
        reason: actor.requestId,
      });
      return {
        territory: created,
        conflicts: conflicts.filter((c) => c.aId === 'pending' || c.bId === 'pending'),
        event: franchiseEvent(FRANCHISE_EVENTS.territoryAssigned, {
          tenantId: actor.tenantId,
          unitId: created.unitId,
          occurredAt: new Date().toISOString(),
          payload: { territoryId: created.id },
        }),
      };
    },

    async listTerritories(actor: FranchiseActor) {
      await this.requireSchema();
      assertAgreementRead(actor.role);
      const rows = await store.listTerritories(actor);
      const scoped = rows.filter((row) => !row.unitId || canScope(actor, row.unitId));
      return { territories: scoped, conflicts: findTerritoryConflicts(scoped) };
    },

    async createAgreement(actor: FranchiseActor, input: NewAgreement) {
      await this.requireSchema();
      assertRoyaltyWrite(actor.role);
      for (const unitId of input.unitIds) assertUnitScope(actor, unitId);
      const created = await store.insertAgreement(actor, input);
      await store.insertChangeLog({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        entity: 'agreement',
        entityId: created.id,
        action: 'create',
        before: null,
        after: created,
        reason: actor.requestId,
      });
      return {
        agreement: created,
        event: franchiseEvent(FRANCHISE_EVENTS.agreementActivated, {
          tenantId: actor.tenantId,
          unitId: created.unitIds[0] ?? null,
          occurredAt: new Date().toISOString(),
          payload: { agreementId: created.id },
        }),
      };
    },

    async listAgreements(actor: FranchiseActor) {
      await this.requireSchema();
      assertAgreementRead(actor.role);
      const rows = await store.listAgreements(actor);
      return rows.filter((row) => row.unitIds.every((id) => canScope(actor, id)) || row.unitIds.length === 0);
    },

    async listSalesReports(actor: FranchiseActor) {
      await this.requireSchema();
      assertRoyaltyRead(actor.role);
      const rows = await store.listSalesReports(actor);
      return rows.filter((row) => canScope(actor, row.unitId));
    },

    async reportSales(actor: FranchiseActor, input: NewSalesReport) {
      await this.requireSchema();
      assertRoyaltyWrite(actor.role);
      assertUnitScope(actor, input.unitId);
      const created = await store.insertSalesReport(actor, input);
      await store.insertChangeLog({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        entity: 'sales_report',
        entityId: created.id,
        action: 'create',
        before: null,
        after: created,
        reason: actor.requestId,
      });
      return {
        report: created,
        event: franchiseEvent(FRANCHISE_EVENTS.salesReported, {
          tenantId: actor.tenantId,
          unitId: created.unitId,
          occurredAt: new Date().toISOString(),
          payload: { salesReportId: created.id },
        }),
      };
    },

    async createRuleVersion(actor: FranchiseActor, current: RoyaltyRule, patch: Partial<RoyaltyRule>) {
      await this.requireSchema();
      assertRoyaltyWrite(actor.role);
      const next = nextRoyaltyRuleVersion(current, patch);
      return store.insertRoyaltyRule(actor, next);
    },

    async calculateFromReport(
      actor: FranchiseActor,
      input: { reportId: string; ruleId: string; ruleVersion: number }
    ) {
      await this.requireSchema();
      assertRoyaltyWrite(actor.role);
      const report = await store.getSalesReport(actor, input.reportId);
      if (!report) throw new FranchisePersistenceError('not_found', 'sales report not found', 404);
      assertUnitScope(actor, report.unitId);
      const rule = await store.getRoyaltyRule(actor, input.ruleId, input.ruleVersion);
      if (!rule) throw new FranchisePersistenceError('not_found', 'royalty rule version not found', 404);
      const calculation = calculateRoyalty({
        id: crypto.randomUUID(),
        unitId: report.unitId,
        rule,
        report,
        calculatedAt: new Date().toISOString(),
      });
      const persisted = await store.insertCalculation(actor, calculation);
      await store.insertChangeLog({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        entity: 'royalty_calculation',
        entityId: persisted.id,
        action: 'create',
        before: null,
        after: persisted,
        reason: actor.requestId,
      });
      return {
        calculation: persisted,
        event: franchiseEvent(FRANCHISE_EVENTS.royaltyCalculated, {
          tenantId: actor.tenantId,
          unitId: persisted.unitId,
          occurredAt: persisted.calculatedAt,
          payload: { royaltyDueMinor: persisted.royaltyDueMinor, ruleVersion: persisted.ruleVersion },
        }),
      };
    },

    async listRoyalties(actor: FranchiseActor) {
      await this.requireSchema();
      assertRoyaltyRead(actor.role);
      const rows = await store.listCalculations(actor);
      return rows.filter((row) => canScope(actor, row.unitId));
    },

    async recordPayment(
      actor: FranchiseActor,
      input: {
        calculationId: string;
        amountMinor: number;
        currency: string;
        method: 'manual' | 'stripe' | 'wompi' | 'bank' | 'other';
        externalReference: string | null;
      }
    ) {
      await this.requireSchema();
      assertRoyaltyWrite(actor.role);
      return store.insertPayment(actor, {
        tenantId: actor.tenantId,
        calculationId: input.calculationId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: 'paid',
        method: input.method,
        externalReference: input.externalReference,
        paidAt: new Date().toISOString(),
      });
    },

    async createAudit(actor: FranchiseActor, input: NewAudit) {
      await this.requireSchema();
      assertAuditRead(actor.role);
      assertUnitScope(actor, input.unitId);
      return store.insertAudit(actor, input);
    },

    async addFinding(
      actor: FranchiseActor,
      input: {
        auditId: string;
        unitId: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        notes: string;
        standardRef: string | null;
      }
    ) {
      await this.requireSchema();
      assertAuditRead(actor.role);
      assertUnitScope(actor, input.unitId);
      return store.insertFinding(actor, {
        tenantId: actor.tenantId,
        auditId: input.auditId,
        unitId: input.unitId,
        severity: input.severity,
        standardRef: input.standardRef,
        evidence: null,
        notes: input.notes,
      });
    },

    async addCorrectiveAction(
      actor: FranchiseActor,
      input: {
        findingId: string;
        unitId: string;
        owner: string;
        dueDate: string;
      }
    ) {
      await this.requireSchema();
      assertAuditRead(actor.role);
      assertUnitScope(actor, input.unitId);
      const created = await store.insertCorrectiveAction(actor, {
        tenantId: actor.tenantId,
        findingId: input.findingId,
        unitId: input.unitId,
        owner: input.owner,
        dueDate: input.dueDate,
        status: 'open',
        resolution: null,
        evidence: null,
      });
      return {
        action: created,
        event: franchiseEvent(FRANCHISE_EVENTS.correctiveActionCreated, {
          tenantId: actor.tenantId,
          unitId: created.unitId,
          occurredAt: new Date().toISOString(),
          payload: { findingId: created.findingId },
        }),
      };
    },

    async listAudits(actor: FranchiseActor) {
      await this.requireSchema();
      assertAuditRead(actor.role);
      const audits = await store.listAudits(actor);
      return audits.filter((row) => canScope(actor, row.unitId));
    },

    async startOpening(actor: FranchiseActor, unitId: string) {
      await this.requireSchema();
      assertOpeningWrite(actor.role);
      assertUnitScope(actor, unitId);
      const header = await store.upsertOpeningChecklist(actor, unitId);
      let tasks = await store.listOpeningTasks(actor, header.id);
      if (tasks.length === 0) {
        const seeded = defaultOpeningTasks({ tenantId: actor.tenantId, checklistId: header.id });
        tasks = await store.insertOpeningTasks(actor, unitId, seeded);
      }
      if (header.status !== 'activated') {
        await store.updateUnitOpening(actor, unitId, { status: 'opening', openingStatus: 'contract' });
      }
      const checklist = assembleOpeningChecklist({ ...header, tasks });
      await store.insertChangeLog({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        entity: 'opening_checklist',
        entityId: header.id,
        action: 'create',
        before: null,
        after: checklist,
        reason: actor.requestId,
      });
      return {
        checklist,
        blockers: openingBlockers(checklist),
        canActivate: canActivateUnit(checklist),
        event: franchiseEvent(FRANCHISE_EVENTS.unitOpeningStarted, {
          tenantId: actor.tenantId,
          unitId,
          occurredAt: new Date().toISOString(),
          payload: { checklistId: header.id },
        }),
      };
    },

    async listOpenings(actor: FranchiseActor) {
      await this.requireSchema();
      assertOpeningRead(actor.role);
      const headers = await store.listOpeningChecklists(actor);
      const scoped = headers.filter((row) => canScope(actor, row.unitId));
      const checklists: OpeningChecklist[] = [];
      for (const header of scoped) {
        const tasks = await store.listOpeningTasks(actor, header.id);
        checklists.push(assembleOpeningChecklist({ ...header, tasks }));
      }
      return checklists.map((checklist) => ({
        checklist,
        blockers: openingBlockers(checklist),
        canActivate: canActivateUnit(checklist),
      }));
    },

    async completeOpeningTask(
      actor: FranchiseActor,
      input: {
        taskId: string;
        status: TaskStatus;
        evidenceUri?: string | null;
      }
    ) {
      await this.requireSchema();
      assertOpeningWrite(actor.role);
      const current = await store.getOpeningTask(actor, input.taskId);
      if (!current) throw new FranchisePersistenceError('not_found', 'opening task not found', 404);
      const header = (await store.listOpeningChecklists(actor)).find((row) => row.id === current.checklistId);
      if (!header) throw new FranchisePersistenceError('not_found', 'opening checklist not found', 404);
      assertUnitScope(actor, header.unitId);
      const evidence: DocumentReference | null = input.evidenceUri
        ? {
            id: crypto.randomUUID(),
            tenantId: actor.tenantId,
            kind: 'opening_evidence',
            uri: input.evidenceUri,
            visibility: 'unit',
            ownerScope: 'unit',
            version: '1',
            expiresAt: null,
          }
        : current.evidence;
      const next = applyOpeningTaskProgress(current, input.status, evidence);
      const saved = await store.updateOpeningTask(actor, next);
      const tasks = await store.listOpeningTasks(actor, header.id);
      const checklist = assembleOpeningChecklist({ ...header, tasks });
      const ready = canActivateUnit(checklist);
      await store.markChecklistStatus(actor, header.id, ready ? 'ready' : 'in_progress');
      return {
        task: saved,
        checklist,
        blockers: openingBlockers(checklist),
        canActivate: ready,
        event: franchiseEvent(FRANCHISE_EVENTS.openingTaskCompleted, {
          tenantId: actor.tenantId,
          unitId: header.unitId,
          occurredAt: new Date().toISOString(),
          payload: { taskId: saved.id, phase: saved.phase },
        }),
      };
    },

    async activateUnit(actor: FranchiseActor, unitId: string) {
      await this.requireSchema();
      assertOpeningWrite(actor.role);
      assertUnitScope(actor, unitId);
      const header = (await store.listOpeningChecklists(actor)).find((row) => row.unitId === unitId);
      if (!header) throw new FranchisePersistenceError('not_found', 'opening checklist not found', 404);
      const tasks = await store.listOpeningTasks(actor, header.id);
      const checklist = assembleOpeningChecklist({ ...header, tasks });
      if (!canActivateUnit(checklist)) {
        throw new FranchisePersistenceError(
          'opening_blocked',
          'Required opening tasks are incomplete',
          409
        );
      }
      await store.markChecklistStatus(actor, header.id, 'activated');
      await store.updateUnitOpening(actor, unitId, { status: 'active', openingStatus: null });
      await store.insertChangeLog({
        tenantId: actor.tenantId,
        actorId: actor.actorId,
        entity: 'franchise_unit',
        entityId: unitId,
        action: 'status_change',
        before: { status: 'opening' },
        after: { status: 'active' },
        reason: actor.requestId,
      });
      return {
        checklist,
        event: franchiseEvent(FRANCHISE_EVENTS.unitActivated, {
          tenantId: actor.tenantId,
          unitId,
          occurredAt: new Date().toISOString(),
          payload: { checklistId: header.id },
        }),
      };
    },

    async listReminders(actor: FranchiseActor, nowIso = new Date().toISOString()) {
      await this.requireSchema();
      assertOpeningRead(actor.role);
      const [agreements, calculations, audits, openings] = await Promise.all([
        this.listAgreements(actor).catch(() => []),
        this.listRoyalties(actor).catch(() => []),
        this.listAudits(actor).catch(() => []),
        this.listOpenings(actor),
      ]);
      return reminderEvents({
        nowIso,
        agreements,
        calculations,
        payments: [],
        audits,
        checklists: openings.map((row) => row.checklist),
      });
    },
  };
}

function canScope(actor: FranchiseActor, unitId: string): boolean {
  try {
    assertUnitScope(actor, unitId);
    return true;
  } catch {
    return false;
  }
}

export type { SalesReport };
