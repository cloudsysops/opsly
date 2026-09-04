import type {
  FranchiseAudit,
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
           (tenant_id, unit_id, name, type, status, geo, exclusive, exclusive_for, valid_from, valid_to, service_model)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          actor.tenantId,
          row.unitId,
          row.name,
          row.type,
          row.status ?? 'active',
          row.geo ? JSON.stringify(row.geo) : null,
          row.exclusive,
          row.exclusiveFor,
          row.validFrom,
          row.validTo,
          row.serviceModel,
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
           (tenant_id, franchisee_id, state, effective_date, expiration_date, renewal_type,
            renewal_term_months, notice_days, canonical_fee, royalty_rule_id, territory_id, document_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
         RETURNING *`,
        [
          actor.tenantId,
          row.franchiseeId,
          row.state ?? 'draft',
          row.effectiveDate,
          row.expirationDate,
          row.renewalType,
          row.renewalTermMonths,
          row.noticeDays,
          row.canonicalFee ? JSON.stringify(row.canonicalFee) : null,
          row.royaltyRuleId,
          row.territoryId,
          row.documentRef,
        ]
      );
      const agreement = mapAgreement(rows[0]);
      for (const unitId of agreement.unitIds) {
        await query(`INSERT INTO platform.franchise_agreement_units (agreement_id, unit_id) VALUES ($1,$2)`, [agreement.id, unitId]);
      }
      return agreement;
    },
    async listAgreements(actor) {
      const rows = await query<Record<string, unknown>>(
        `SELECT a.*, COALESCE(array_agg(au.unit_id) FILTER (WHERE au.unit_id IS NOT NULL), '{}') AS unit_ids
         FROM platform.franchise_agreements a
         LEFT JOIN platform.franchise_agreement_units au ON au.agreement_id = a.id
         WHERE a.tenant_id = $1
         GROUP BY a.id ORDER BY a.expiration_date ASC`,
        [actor.tenantId]
      );
      return rows.map(mapAgreement);
    },
    async insertRoyaltyRule(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.royalty_rules
           (tenant_id, rule_id, name, basis, percentage, minimum_amount, fixed_fee, currency,
            frequency, excluded_categories, tax_treatment, effective_from, effective_to, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          actor.tenantId,
          row.id,
          row.name,
          row.basis,
          row.percentage,
          row.minimumAmount?.amount ?? null,
          row.fixedFee?.amount ?? null,
          row.currency,
          row.frequency,
          JSON.stringify(row.excludedCategories),
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
        `SELECT * FROM platform.royalty_rules WHERE tenant_id = $1 AND rule_id = $2 AND version = $3`,
        [actor.tenantId, id, version]
      );
      return rows[0] ? mapRule(rows[0]) : null;
    },
    async listRoyaltyRules(actor, id) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_rules WHERE tenant_id = $1 AND rule_id = $2 ORDER BY version ASC`,
        [actor.tenantId, id]
      );
      return rows.map(mapRule);
    },
    async insertSalesReport(actor, row) {
      try {
        const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.sales_reports
           (tenant_id, unit_id, period_start, period_end, gross_sales, refunds, taxes,
            excluded_sales, net_sales, currency, source, source_reference, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          actor.tenantId,
          row.unitId,
          row.periodStart,
          row.periodEnd,
          row.grossSales,
          row.refunds,
          row.taxes,
          row.excludedSales,
          row.netSales,
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
        `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 AND unit_id = $2 AND sales_report_id = $3 AND rule_version = $4`,
        [actor.tenantId, row.unitId, row.salesReportId, row.ruleVersion]
      );
      if (existing[0]) return mapCalculation(existing[0]);
      try {
        const rows = await query<Record<string, unknown>>(
          `INSERT INTO platform.royalty_calculations
             (id, tenant_id, unit_id, sales_report_id, rule_id, rule_version, basis,
              reported_sales, exclusions, royalty_base, percentage, percentage_amount, fixed_fee,
              minimum_applied, royalty_due, currency, status, inputs, calculation, result)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20::jsonb)
           RETURNING *`,
          [
            row.id,
            actor.tenantId,
            row.unitId,
            row.salesReportId,
            row.ruleId,
            row.ruleVersion,
            row.basis,
            row.reportedSales,
            row.exclusions,
            row.royaltyBase,
            row.percentage,
            row.percentageAmount,
            row.fixedFee,
            row.minimumApplied,
            row.royaltyDue,
            row.currency,
            row.status,
            JSON.stringify(row.inputs),
            JSON.stringify(row.calculation),
            JSON.stringify(row.result),
          ]
        );
        return mapCalculation(rows[0]);
      } catch (error) {
        if (error && typeof error === 'object' && (error as { code?: string }).code === '23505') {
          const raced = await query<Record<string, unknown>>(
            `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 AND unit_id = $2 AND sales_report_id = $3 AND rule_version = $4`,
            [actor.tenantId, row.unitId, row.salesReportId, row.ruleVersion]
          );
          if (raced[0]) return mapCalculation(raced[0]);
        }
        throw error;
      }
    },
    async getCalculationByKey(actor, key) {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM platform.royalty_calculations WHERE tenant_id = $1 AND unit_id = $2 AND sales_report_id = $3 AND rule_version = $4`,
        [actor.tenantId, key.unitId, key.salesReportId, key.ruleVersion]
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
           (tenant_id, calculation_id, amount, currency, status, method, external_reference, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          actor.tenantId,
          row.calculationId,
          row.amount,
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
        `INSERT INTO platform.audit_templates (id, tenant_id, name, version, definition)
         VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5::jsonb)
         RETURNING id`,
        [row.id ?? null, actor.tenantId, row.name, row.version, JSON.stringify(row.questions)]
      );
      return { id: rows[0].id };
    },
    async insertAudit(actor, row) {
      const rows = await query<Record<string, unknown>>(
        `INSERT INTO platform.audits
           (tenant_id, unit_id, template_id, auditor, scheduled_at, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          actor.tenantId,
          row.unitId,
          row.templateId,
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
        `SELECT * FROM platform.audits WHERE tenant_id = $1 ORDER BY scheduled_at DESC`,
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
        `INSERT INTO platform.audit_events
           (tenant_slug, actor_email, action, resource, status_code, metadata)
         SELECT slug, $2, $3, $4 || '/' || $5, 200, $6::jsonb
         FROM platform.tenants WHERE id = $1`,
        [
          input.tenantId,
          input.actorId,
          input.action,
          input.entity,
          input.entityId,
          JSON.stringify({ before: input.before, after: input.after, reason: input.reason }),
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
    type: row.type as Territory['type'],
    status: row.status as Territory['status'],
    exclusive: Boolean(row.exclusive),
    exclusiveFor: row.exclusive_for as Territory['exclusiveFor'],
    validFrom: row.valid_from ? asDate(row.valid_from as Date | string) : null,
    validTo: row.valid_to ? asDate(row.valid_to as Date | string) : null,
    unitId: row.unit_id ? String(row.unit_id) : null,
    serviceModel: row.service_model ? String(row.service_model) : null,
    geo: parseJson<Territory['geo']>(row.geo),
    createdAt: asIso(row.created_at as Date | string),
    updatedAt: row.updated_at ? asIso(row.updated_at as Date | string) : null,
  };
}

function mapAgreement(row: Record<string, unknown>): FranchiseAgreement {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    franchiseeId: String(row.franchisee_id),
    unitIds: (row.unit_ids as string[]) ?? [],
    state: row.state as FranchiseAgreement['state'],
    effectiveDate: asDate(row.effective_date as Date | string),
    expirationDate: asDate(row.expiration_date as Date | string),
    renewalType: row.renewal_type as FranchiseAgreement['renewalType'],
    renewalTermMonths: row.renewal_term_months == null ? null : Number(row.renewal_term_months),
    noticeDays: Number(row.notice_days),
    canonicalFee: parseJson<FranchiseAgreement['canonicalFee']>(row.canonical_fee),
    royaltyRuleId: row.royalty_rule_id ? String(row.royalty_rule_id) : null,
    territoryId: row.territory_id ? String(row.territory_id) : null,
    documentRef: row.document_ref ? String(row.document_ref) : null,
    createdAt: asIso(row.created_at as Date | string),
    updatedAt: row.updated_at ? asIso(row.updated_at as Date | string) : null,
  };
}

function mapRule(row: Record<string, unknown>): RoyaltyRule {
  return {
    id: String(row.rule_id),
    tenantId: String(row.tenant_id),
    name: String(row.name),
    basis: row.basis as RoyaltyRule['basis'],
    percentage: Number(row.percentage),
    minimumAmount: row.minimum_amount == null ? null : { amount: Number(row.minimum_amount), currency: String(row.currency) },
    fixedFee: row.fixed_fee == null ? null : { amount: Number(row.fixed_fee), currency: String(row.currency) },
    currency: String(row.currency),
    frequency: row.frequency as RoyaltyRule['frequency'],
    excludedCategories: parseJson<string[]>(row.excluded_categories) ?? [],
    taxTreatment: row.tax_treatment as RoyaltyRule['taxTreatment'],
    effectiveFrom: asDate(row.effective_from as Date | string),
    effectiveTo: row.effective_to ? asDate(row.effective_to as Date | string) : null,
    version: Number(row.version),
    createdAt: asIso(row.created_at as Date | string),
    updatedAt: row.updated_at ? asIso(row.updated_at as Date | string) : null,
  };
}

function mapReport(row: Record<string, unknown>): SalesReport {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    periodStart: asDate(row.period_start as Date | string),
    periodEnd: asDate(row.period_end as Date | string),
    grossSales: Number(row.gross_sales),
    refunds: Number(row.refunds),
    taxes: Number(row.taxes),
    excludedSales: Number(row.excluded_sales),
    netSales: Number(row.net_sales),
    currency: String(row.currency),
    source: row.source as SalesReport['source'],
    sourceReference: row.source_reference ? String(row.source_reference) : null,
    status: row.status as SalesReport['status'],
    createdAt: asIso(row.created_at as Date | string),
    submittedAt: row.submitted_at ? asIso(row.submitted_at as Date | string) : null,
    updatedAt: row.updated_at ? asIso(row.updated_at as Date | string) : null,
  };
}

function mapCalculation(row: Record<string, unknown>): RoyaltyCalculation {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    salesReportId: String(row.sales_report_id),
    ruleId: String(row.rule_id),
    ruleVersion: Number(row.rule_version),
    basis: row.basis as RoyaltyCalculation['basis'],
    reportedSales: Number(row.reported_sales),
    exclusions: Number(row.exclusions),
    royaltyBase: Number(row.royalty_base),
    percentage: Number(row.percentage),
    percentageAmount: Number(row.percentage_amount),
    fixedFee: Number(row.fixed_fee),
    minimumApplied: Boolean(row.minimum_applied),
    royaltyDue: Number(row.royalty_due),
    currency: String(row.currency),
    status: row.status as RoyaltyCalculation['status'],
    inputs: parseJson<Record<string, unknown>>(row.inputs) ?? {},
    calculation: parseJson<Record<string, unknown>>(row.calculation) ?? {},
    result: parseJson<Record<string, unknown>>(row.result) ?? {},
    createdAt: asIso(row.created_at as Date | string),
  };
}

function mapPayment(row: Record<string, unknown>): RoyaltyPayment {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    calculationId: String(row.calculation_id),
    amount: Number(row.amount),
    currency: String(row.currency),
    status: row.status as RoyaltyPayment['status'],
    method: row.method as RoyaltyPayment['method'],
    externalReference: row.external_reference ? String(row.external_reference) : null,
    paidAt: row.paid_at ? asIso(row.paid_at as Date | string) : null,
    createdAt: asIso(row.created_at as Date | string),
  };
}

function mapAudit(row: Record<string, unknown>): FranchiseAudit {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    unitId: String(row.unit_id),
    templateId: String(row.template_id),
    auditor: String(row.auditor),
    scheduledAt: asIso(row.scheduled_at as Date | string),
    performedAt: row.performed_at ? asIso(row.performed_at as Date | string) : null,
    score: row.score == null ? null : Number(row.score),
    status: row.status as FranchiseAudit['status'],
    createdAt: asIso(row.created_at as Date | string),
    updatedAt: row.updated_at ? asIso(row.updated_at as Date | string) : null,
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
    evidence: row.evidence ? String(row.evidence) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: asIso(row.created_at as Date | string),
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
    evidence: row.evidence ? String(row.evidence) : null,
    createdAt: asIso(row.created_at as Date | string),
    updatedAt: row.updated_at ? asIso(row.updated_at as Date | string) : null,
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
      phone: '',
    },
    createdAt: asIso(row.created_at as Date | string),
  };
}

function parseJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === 'string') return JSON.parse(value) as T;
  return value as T;
}
