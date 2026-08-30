import type {
  Audit,
  AuditFinding,
  CorrectiveAction,
  DocumentReference,
  FranchiseAgreement,
  Franchisee,
  RoyaltyCalculation,
  RoyaltyCalculationInputs,
  RoyaltyPayment,
  RoyaltyRule,
  SalesReport,
  Territory,
  TerritoryGeometry,
} from '@intcloudsysops/franchise-core';
import { FRANCHISE_SCHEMA_NOT_AVAILABLE, FranchisePersistenceError, isUndefinedTable, schemaMissingError } from './errors.js';
import type { FranchiseStore } from './store.js';

export type SqlQuery = <T>(text: string, values?: unknown[]) => Promise<T[]>;

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function asDate(value: Date | string): string {
  return asIso(value).slice(0, 10);
}

function wrap(query: SqlQuery): SqlQuery {
  return async <T>(text: string, values?: unknown[]): Promise<T[]> => {
    try {
      return await query<T>(text, values);
    } catch (error) {
      if (error && typeof error === 'object' && isUndefinedTable(error as { code?: string; message?: string })) {
        throw schemaMissingError();
      }
      throw error;
    }
  };
}

export function createPgFranchiseStore(rawQuery: SqlQuery): FranchiseStore {
  const query = wrap(rawQuery);

  async function probeSchema(): Promise<boolean> {
    try {
      await query(`SELECT 1 FROM platform.franchise_territories LIMIT 1`);
      return true;
    } catch (error) {
      if (error instanceof FranchisePersistenceError && error.code === FRANCHISE_SCHEMA_NOT_AVAILABLE) {
        return false;
      }
      if (String(error).includes(FRANCHISE_SCHEMA_NOT_AVAILABLE)) return false;
      throw error;
    }
  }

  return {
    probeSchema,
    async resolveTenantId(slug) {
      const rows = await query<{ id: string }>(
        `SELECT id FROM platform.tenants WHERE slug = $1 AND deleted_at IS NULL LIMIT 1`,
        [slug]
      );
      return rows[0]?.id ?? null;
    },
    async insertFranchisee(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.franchisees (tenant_id, legal_name, tax_id, status, primary_contact)
         VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *`,
        [actor.tenantId, row.legalName, row.taxId, row.status, JSON.stringify(row.primaryContact)]
      );
      return mapFranchisee(rows[0]);
    },
    async insertTerritory(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.franchise_territories
           (tenant_id, unit_id, name, status, geometry, exclusive, exclusive_for, valid_from, valid_to)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
         RETURNING *`,
        [
          actor.tenantId,
          row.unitId,
          row.name,
          row.status ?? 'active',
          JSON.stringify(row.geometry),
          row.exclusive,
          row.exclusiveFor,
          row.validFrom,
          row.validTo,
        ]
      );
      return mapTerritory(rows[0]);
    },
    async listTerritories(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.franchise_territories WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [actor.tenantId]
      );
      return rows.map(mapTerritory);
    },
    async insertAgreement(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.franchise_agreements
           (tenant_id, franchisee_id, unit_ids, status, effective_date, expiration_date, renewal_type,
            renewal_term_months, notice_days, canonical_fee_minor, currency, royalty_rule_id, territory_id, document_ref)
         VALUES ($1,$2,$3::uuid[],$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
         RETURNING *`,
        [
          actor.tenantId,
          row.franchiseeId,
          row.unitIds,
          row.status ?? 'draft',
          row.effectiveDate,
          row.expirationDate,
          row.renewalType,
          row.renewalTermMonths,
          row.noticeDays,
          row.canonicalFeeMinor,
          row.currency,
          row.royaltyRuleId,
          row.territoryId,
          row.documentRef ? JSON.stringify(row.documentRef) : null,
        ]
      );
      return mapAgreement(rows[0]);
    },
    async listAgreements(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.franchise_agreements WHERE tenant_id = $1 ORDER BY expiration_date ASC`,
        [actor.tenantId]
      );
      return rows.map(mapAgreement);
    },
    async insertRoyaltyRule(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.royalty_rules
           (id, tenant_id, name, basis, percentage_bps, minimum_amount_minor, fixed_fee_minor, currency,
            frequency, excluded_categories, tax_treatment, effective_from, effective_to, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          row.id,
          actor.tenantId,
          row.name,
          row.basis,
          row.percentageBps,
          row.minimumAmountMinor,
          row.fixedFeeMinor,
          row.currency,
          row.frequency,
          row.excludedCategories,
          row.taxTreatment,
          row.effectiveFrom,
          row.effectiveTo,
          row.version ?? 1,
        ]
      );
      return mapRule(rows[0]);
    },
    async getRoyaltyRule(actor, id, version) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_rules WHERE tenant_id = $1 AND id = $2 AND version = $3`,
        [actor.tenantId, id, version]
      );
      return rows[0] ? mapRule(rows[0]) : null;
    },
    async listRoyaltyRules(actor, id) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_rules WHERE tenant_id = $1 AND id = $2 ORDER BY version ASC`,
        [actor.tenantId, id]
      );
      return rows.map(mapRule);
    },
    async insertSalesReport(actor, row) {
      try {
        const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.sales_reports
           (tenant_id, unit_id, period_start, period_end, gross_sales_minor, refunds_minor, taxes_minor,
            excluded_sales_minor, net_sales_minor, currency, source, source_reference, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          actor.tenantId,
          row.unitId,
          row.periodStart,
          row.periodEnd,
          row.grossSalesMinor,
          row.refundsMinor,
          row.taxesMinor,
          row.excludedSalesMinor,
          row.netSalesMinor,
          row.currency,
          row.source,
          row.sourceReference,
          row.status ?? 'submitted',
        ]
      );
        return mapReport(rows[0]);
      } catch (error) {
        if (error && typeof error === 'object' && (error as { code?: string }).code === '23505') {
          const existing = await query<Record<string, unknown>>(
            `SELECT * FROM platform.sales_reports
             WHERE tenant_id = $1 AND unit_id = $2 AND period_start = $3 AND period_end = $4
               AND source = $5 AND COALESCE(source_reference, '') = COALESCE($6, '')`,
            [
              actor.tenantId,
              row.unitId,
              row.periodStart,
              row.periodEnd,
              row.source,
              row.sourceReference,
            ]
          );
          if (existing[0]) return mapReport(existing[0]);
        }
        throw error;
      }
    },
    async getSalesReport(actor, id) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.sales_reports WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id]
      );
      return rows[0] ? mapReport(rows[0]) : null;
    },
    async listSalesReports(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.sales_reports WHERE tenant_id = $1 ORDER BY period_start DESC`,
        [actor.tenantId]
      );
      return rows.map(mapReport);
    },
    async insertCalculation(actor, row) {
      const existing = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 AND idempotency_key = $2`,
        [actor.tenantId, row.idempotencyKey]
      );
      if (existing[0]) return mapCalculation(existing[0]);
      try {
        const rows = await query<Record<string, unknown>>(
          `INSERT INTO platform.royalty_calculations
             (id, tenant_id, unit_id, sales_report_id, royalty_rule_id, rule_version, currency, inputs,
              royalty_due_minor, calculated_at, idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
           RETURNING *`,
          [
            row.id,
            actor.tenantId,
            row.unitId,
            row.salesReportId,
            row.royaltyRuleId,
            row.ruleVersion,
            row.currency,
            JSON.stringify(row.inputs),
            row.royaltyDueMinor,
            row.calculatedAt,
            row.idempotencyKey,
          ]
        );
        return mapCalculation(rows[0]);
      } catch (error) {
        if (error && typeof error === 'object' && (error as { code?: string }).code === '23505') {
          const raced = await query<Record<string, unknown>>(
            `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 AND idempotency_key = $2`,
            [actor.tenantId, row.idempotencyKey]
          );
          if (raced[0]) return mapCalculation(raced[0]);
        }
        throw error;
      }
    },
    async getCalculationByKey(actor, idempotencyKey) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 AND idempotency_key = $2`,
        [actor.tenantId, idempotencyKey]
      );
      return rows[0] ? mapCalculation(rows[0]) : null;
    },
    async listCalculations(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 ORDER BY calculated_at DESC`,
        [actor.tenantId]
      );
      return rows.map(mapCalculation);
    },
    async insertPayment(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.royalty_payments
           (tenant_id, calculation_id, amount_minor, currency, status, method, external_reference, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          actor.tenantId,
          row.calculationId,
          row.amountMinor,
          row.currency,
          row.status,
          row.method,
          row.externalReference,
          row.paidAt,
        ]
      );
      return mapPayment(rows[0]);
    },
    async insertAuditTemplate(actor, row) {
      const rows = await query<{ id: string }>(
        `INSERT INTO platform.audit_templates (id, tenant_id, name, version, questions)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5::jsonb)
         RETURNING id`,
        [row.id ?? null, actor.tenantId, row.name, row.version, JSON.stringify(row.questions)]
      );
      return { id: rows[0].id };
    },
    async insertAudit(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.franchise_audits
           (tenant_id, unit_id, template_id, template_version, auditor, scheduled_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          actor.tenantId,
          row.unitId,
          row.templateId,
          row.templateVersion,
          row.auditor,
          row.scheduledAt,
          row.status ?? 'scheduled',
        ]
      );
      return mapAudit(rows[0]);
    },
    async insertFinding(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.audit_findings
           (tenant_id, audit_id, unit_id, severity, standard_ref, evidence, notes)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING *`,
        [
          actor.tenantId,
          row.auditId,
          row.unitId,
          row.severity,
          row.standardRef,
          row.evidence ? JSON.stringify(row.evidence) : null,
          row.notes,
        ]
      );
      return mapFinding(rows[0]);
    },
    async insertCorrectiveAction(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.corrective_actions
           (tenant_id, finding_id, unit_id, owner, due_date, status, resolution, evidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *`,
        [
          actor.tenantId,
          row.findingId,
          row.unitId,
          row.owner,
          row.dueDate,
          row.status,
          row.resolution,
          row.evidence ? JSON.stringify(row.evidence) : null,
        ]
      );
      return mapAction(rows[0]);
    },
    async listAudits(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.franchise_audits WHERE tenant_id = $1 ORDER BY scheduled_at DESC`,
        [actor.tenantId]
      );
      return rows.map(mapAudit);
    },
    async listFindings(actor, auditId) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.audit_findings WHERE tenant_id = $1 AND audit_id = $2`,
        [actor.tenantId, auditId]
      );
      return rows.map(mapFinding);
    },
    async listCorrectiveActions(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.corrective_actions WHERE tenant_id = $1 ORDER BY due_date ASC`,
        [actor.tenantId]
      );
      return rows.map(mapAction);
    },
    async insertChangeLog(input) {
      await query(
        `INSERT INTO platform.franchise_change_log
           (tenant_id, actor_id, entity, entity_id, action, before, after, reason)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)`,
        [
          input.tenantId,
          input.actorId,
          input.entity,
          input.entityId,
          input.action,
          JSON.stringify(input.before),
          JSON.stringify(input.after),
          input.reason,
        ]
      );
    },
  };
}

function mapTerritory(row: Record<string, unknown>): Territory {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.name),
    status: row.status as Territory['status'],
    geometry: row.geometry as TerritoryGeometry,
    exclusive: Boolean(row.exclusive),
    exclusiveFor: row.exclusive_for as Territory['exclusiveFor'],
    validFrom: asDate(row.valid_from as Date | string),
    validTo: row.valid_to ? asDate(row.valid_to as Date | string) : null,
    unitId: row.unit_id ? String(row.unit_id) : null,
  };
}

function mapAgreement(row: Record<string, unknown>): FranchiseAgreement {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    franchiseeId: String(row.franchisee_id),
    unitIds: (row.unit_ids as string[]) ?? [],
    status: row.status as FranchiseAgreement['status'],
    effectiveDate: asDate(row.effective_date as Date | string),
    expirationDate: asDate(row.expiration_date as Date | string),
    renewalType: row.renewal_type as FranchiseAgreement['renewalType'],
    renewalTermMonths: row.renewal_term_months == null ? null : Number(row.renewal_term_months),
    noticeDays: Number(row.notice_days),
    canonicalFeeMinor: Number(row.canonical_fee_minor),
    currency: String(row.currency),
    royaltyRuleId: row.royalty_rule_id ? String(row.royalty_rule_id) : null,
    territoryId: row.territory_id ? String(row.territory_id) : null,
    documentRef: (row.document_ref as DocumentReference | null) ?? null,
    createdAt: asIso(row.created_at as Date | string),
  };
}

function mapRule(row: Record<string, unknown>): RoyaltyRule {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    name: String(row.name),
    basis: row.basis as RoyaltyRule['basis'],
    percentageBps: Number(row.percentage_bps),
    minimumAmountMinor: row.minimum_amount_minor == null ? null : Number(row.minimum_amount_minor),
    fixedFeeMinor: row.fixed_fee_minor == null ? null : Number(row.fixed_fee_minor),
    currency: String(row.currency),
    frequency: row.frequency as RoyaltyRule['frequency'],
    excludedCategories: (row.excluded_categories as string[]) ?? [],
    taxTreatment: row.tax_treatment as RoyaltyRule['taxTreatment'],
    effectiveFrom: asDate(row.effective_from as Date | string),
    effectiveTo: row.effective_to ? asDate(row.effective_to as Date | string) : null,
    version: Number(row.version),
  };
}

function mapReport(row: Record<string, unknown>): SalesReport {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    periodStart: asDate(row.period_start as Date | string),
    periodEnd: asDate(row.period_end as Date | string),
    grossSalesMinor: Number(row.gross_sales_minor),
    refundsMinor: Number(row.refunds_minor),
    taxesMinor: Number(row.taxes_minor),
    excludedSalesMinor: Number(row.excluded_sales_minor),
    netSalesMinor: Number(row.net_sales_minor),
    currency: String(row.currency),
    source: row.source as SalesReport['source'],
    sourceReference: row.source_reference ? String(row.source_reference) : null,
    status: row.status as SalesReport['status'],
  };
}

function mapCalculation(row: Record<string, unknown>): RoyaltyCalculation {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    salesReportId: String(row.sales_report_id),
    royaltyRuleId: String(row.royalty_rule_id),
    ruleVersion: Number(row.rule_version),
    currency: String(row.currency),
    inputs: row.inputs as RoyaltyCalculationInputs,
    royaltyDueMinor: Number(row.royalty_due_minor),
    calculatedAt: asIso(row.calculated_at as Date | string),
    idempotencyKey: String(row.idempotency_key),
  };
}

function mapPayment(row: Record<string, unknown>): RoyaltyPayment {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    calculationId: String(row.calculation_id),
    amountMinor: Number(row.amount_minor),
    currency: String(row.currency),
    status: row.status as RoyaltyPayment['status'],
    method: row.method as RoyaltyPayment['method'],
    externalReference: row.external_reference ? String(row.external_reference) : null,
    paidAt: row.paid_at ? asIso(row.paid_at as Date | string) : null,
  };
}

function mapAudit(row: Record<string, unknown>): Audit {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    templateId: String(row.template_id),
    templateVersion: Number(row.template_version),
    auditor: String(row.auditor),
    scheduledAt: asIso(row.scheduled_at as Date | string),
    performedAt: row.performed_at ? asIso(row.performed_at as Date | string) : null,
    score: row.score == null ? null : Number(row.score),
    status: row.status as Audit['status'],
  };
}

function mapFinding(row: Record<string, unknown>): AuditFinding {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    auditId: String(row.audit_id),
    unitId: String(row.unit_id),
    severity: row.severity as AuditFinding['severity'],
    standardRef: row.standard_ref ? String(row.standard_ref) : null,
    evidence: (row.evidence as DocumentReference | null) ?? null,
    notes: String(row.notes ?? ''),
  };
}

function mapAction(row: Record<string, unknown>): CorrectiveAction {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    findingId: String(row.finding_id),
    unitId: String(row.unit_id),
    owner: String(row.owner),
    dueDate: asDate(row.due_date as Date | string),
    status: row.status as CorrectiveAction['status'],
    resolution: row.resolution ? String(row.resolution) : null,
    evidence: (row.evidence as DocumentReference | null) ?? null,
  };
}

function mapFranchisee(row: Record<string, unknown>): Franchisee {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    legalName: String(row.legal_name),
    taxId: row.tax_id ? String(row.tax_id) : null,
    status: row.status as Franchisee['status'],
    primaryContact: (row.primary_contact as Franchisee['primaryContact']) ?? {
      name: '',
      email: '',
      phone: null,
    },
    createdAt: asIso(row.created_at as Date | string),
  };
}
