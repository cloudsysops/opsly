import type {
  Audit,
  AuditFinding,
  CorrectiveAction,
  FranchiseAgreement,
  Franchisee,
  RoyaltyCalculation,
  RoyaltyPayment,
  RoyaltyRule,
  SalesReport,
  Territory,
} from '@intcloudsysops/franchise-core';
import type { FranchiseActor } from './actor.js';

export type NewTerritory = Omit<Territory, 'id' | 'status'> & { status?: Territory['status'] };
export type NewAgreement = Omit<FranchiseAgreement, 'id' | 'createdAt' | 'status'> & {
  status?: FranchiseAgreement['status'];
};
export type NewSalesReport = Omit<SalesReport, 'id' | 'status'> & { status?: SalesReport['status'] };
export type NewRoyaltyRule = Omit<RoyaltyRule, 'version'> & { version?: number };
export type NewAudit = Omit<Audit, 'id' | 'score' | 'performedAt' | 'status'> & {
  status?: Audit['status'];
};

export type FranchiseStore = {
  probeSchema(): Promise<boolean>;
  resolveTenantId(slug: string): Promise<string | null>;
  insertFranchisee(actor: FranchiseActor, row: Omit<Franchisee, 'id' | 'createdAt'>): Promise<Franchisee>;
  insertTerritory(actor: FranchiseActor, row: NewTerritory): Promise<Territory>;
  listTerritories(actor: FranchiseActor): Promise<Territory[]>;
  insertAgreement(actor: FranchiseActor, row: NewAgreement): Promise<FranchiseAgreement>;
  listAgreements(actor: FranchiseActor): Promise<FranchiseAgreement[]>;
  insertRoyaltyRule(actor: FranchiseActor, row: NewRoyaltyRule): Promise<RoyaltyRule>;
  getRoyaltyRule(actor: FranchiseActor, id: string, version: number): Promise<RoyaltyRule | null>;
  listRoyaltyRules(actor: FranchiseActor, id: string): Promise<RoyaltyRule[]>;
  insertSalesReport(actor: FranchiseActor, row: NewSalesReport): Promise<SalesReport>;
  getSalesReport(actor: FranchiseActor, id: string): Promise<SalesReport | null>;
  listSalesReports(actor: FranchiseActor): Promise<SalesReport[]>;
  insertCalculation(actor: FranchiseActor, row: RoyaltyCalculation): Promise<RoyaltyCalculation>;
  getCalculationByKey(actor: FranchiseActor, idempotencyKey: string): Promise<RoyaltyCalculation | null>;
  listCalculations(actor: FranchiseActor): Promise<RoyaltyCalculation[]>;
  insertPayment(actor: FranchiseActor, row: Omit<RoyaltyPayment, 'id'>): Promise<RoyaltyPayment>;
  insertAuditTemplate(
    actor: FranchiseActor,
    row: { id?: string; name: string; version: number; questions: unknown }
  ): Promise<{ id: string }>;
  insertAudit(actor: FranchiseActor, row: NewAudit): Promise<Audit>;
  insertFinding(actor: FranchiseActor, row: Omit<AuditFinding, 'id'>): Promise<AuditFinding>;
  insertCorrectiveAction(actor: FranchiseActor, row: Omit<CorrectiveAction, 'id'>): Promise<CorrectiveAction>;
  listAudits(actor: FranchiseActor): Promise<Audit[]>;
  listFindings(actor: FranchiseActor, auditId: string): Promise<AuditFinding[]>;
  listCorrectiveActions(actor: FranchiseActor): Promise<CorrectiveAction[]>;
  insertChangeLog(input: {
    tenantId: string;
    actorId: string;
    entity: string;
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'status_change';
    before: unknown;
    after: unknown;
    reason: string;
  }): Promise<void>;
};
