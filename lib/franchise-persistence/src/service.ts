import {
  buildRoyaltyCalculation,
  findExclusiveTerritoryConflicts,
  FRANCHISE_EVENTS,
  franchiseEvent,
  createNextRuleVersion,
  snapshotRule,
  type RoyaltyRule,
  type SalesReport,
} from '@intcloudsysops/franchise-core';
import type { FranchiseActor } from './actor.js';
import {
  assertAgreementRead,
  assertAuditRead,
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
      if (input.unitId !== undefined && input.unitId !== null) assertUnitScope(actor, input.unitId);
      const existing = await store.listTerritories(actor);
      const next = {
        ...input,
        id: 'pending',
        status: input.status ?? 'active',
      };
      const conflicts = findExclusiveTerritoryConflicts([...existing, next]);
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
          unitId: created.unitId ?? null,
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
      return { territories: scoped, conflicts: findExclusiveTerritoryConflicts(scoped) };
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
      if (!patch.effectiveFrom) throw new FranchisePersistenceError('invalid_input', 'effectiveFrom is required', 400);
      const effectiveFrom = patch.effectiveFrom;
      if (!effectiveFrom) throw new FranchisePersistenceError('invalid_input', 'effectiveFrom is required', 400);
      const next = createNextRuleVersion(current, { ...patch, effectiveFrom }).next;
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
      const calculation = buildRoyaltyCalculation({
        id: crypto.randomUUID(), tenantId: actor.tenantId, unitId: report.unitId,
        salesReport: report, rule: snapshotRule(rule, report.periodEnd), createdAt: new Date().toISOString(),
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
          occurredAt: persisted.createdAt,
          payload: { royaltyDue: persisted.royaltyDue, ruleVersion: persisted.ruleVersion },
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
        amount: number;
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
        amount: input.amount,
        currency: input.currency,
        status: 'paid',
        method: input.method,
        externalReference: input.externalReference,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
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
        severity: 'minor' | 'major' | 'critical' | 'info';
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
        createdAt: new Date().toISOString(),
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
        createdAt: new Date().toISOString(),
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
