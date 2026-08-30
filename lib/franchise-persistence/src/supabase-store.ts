import type { SupabaseClient } from '@supabase/supabase-js';
import { isUndefinedTable, schemaMissingError } from './errors.js';
import type { FranchiseStore } from './store.js';

type PlatformFrom = {
  select: (columns: string) => PlatformFrom;
  insert: (values: Record<string, unknown> | Record<string, unknown>[]) => PlatformFrom;
  eq: (column: string, value: unknown) => PlatformFrom;
  is: (column: string, value: null) => PlatformFrom;
  order: (column: string, opts: { ascending: boolean }) => PlatformFrom;
  limit: (n: number) => PlatformFrom;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { code?: string; message?: string } | null }>;
  then: Promise<{ data: Record<string, unknown>[] | null; error: { code?: string; message?: string } | null }>['then'];
};

export function createSupabaseFranchiseStore(client: SupabaseClient): FranchiseStore {
  return createRestFranchiseStore(client);
}

function createRestFranchiseStore(client: SupabaseClient): FranchiseStore {
  const platform = (): { from: (table: string) => PlatformFrom } =>
    client.schema('platform') as unknown as { from: (table: string) => PlatformFrom };

  async function run<T>(builder: PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>): Promise<T> {
    const { data, error } = await builder;
    if (error) {
      if (isUndefinedTable(error)) throw schemaMissingError();
      throw error;
    }
    if (data == null) throw schemaMissingError();
    return data;
  }

  const store: FranchiseStore = {
    async probeSchema() {
      const { error } = await platform().from('franchise_territories').select('id').limit(1);
      if (error && isUndefinedTable(error)) return false;
      if (error) throw error;
      return true;
    },
    async resolveTenantId(slug) {
      const { data, error } = await platform()
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return data?.id ? String(data.id) : null;
    },
    async insertFranchisee(actor, row) {
      const data = await run(
        platform()
          .from('franchisees')
          .insert({
            tenant_id: actor.tenantId,
            legal_name: row.legalName,
            tax_id: row.taxId,
            status: row.status,
            primary_contact: row.primaryContact,
          })
          .select('*')
          .maybeSingle()
      );
      return {
        id: String(data.id),
        tenantId: actor.tenantId,
        legalName: row.legalName,
        taxId: row.taxId,
        status: row.status,
        primaryContact: row.primaryContact,
        createdAt: String(data.created_at),
      };
    },
    async insertTerritory(actor, row) {
      const data = await run(
        platform()
          .from('franchise_territories')
          .insert({
            tenant_id: actor.tenantId,
            unit_id: row.unitId,
            name: row.name,
            status: row.status ?? 'active',
            geometry: row.geometry,
            exclusive: row.exclusive,
            exclusive_for: row.exclusiveFor,
            valid_from: row.validFrom,
            valid_to: row.validTo,
          })
          .select('*')
          .maybeSingle()
      );
      return {
        id: String(data.id),
        tenantId: actor.tenantId,
        name: row.name,
        status: (data.status as typeof row.status) ?? 'active',
        geometry: row.geometry,
        exclusive: row.exclusive,
        exclusiveFor: row.exclusiveFor,
        validFrom: row.validFrom,
        validTo: row.validTo,
        unitId: row.unitId,
      };
    },
    async listTerritories(actor) {
      const { data, error } = await platform()
        .from('franchise_territories')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .order('created_at', { ascending: false });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: String(row.tenant_id),
        name: String(row.name),
        status: row.status as 'draft' | 'active' | 'expired' | 'revoked',
        geometry: row.geometry as never,
        exclusive: Boolean(row.exclusive),
        exclusiveFor: row.exclusive_for as 'fixed_location' | 'home_service' | 'both',
        validFrom: String(row.valid_from).slice(0, 10),
        validTo: row.valid_to ? String(row.valid_to).slice(0, 10) : null,
        unitId: row.unit_id ? String(row.unit_id) : null,
      }));
    },
    async insertAgreement(actor, row) {
      const data = await run(
        platform()
          .from('franchise_agreements')
          .insert({
            tenant_id: actor.tenantId,
            franchisee_id: row.franchiseeId,
            unit_ids: row.unitIds,
            status: row.status ?? 'draft',
            effective_date: row.effectiveDate,
            expiration_date: row.expirationDate,
            renewal_type: row.renewalType,
            renewal_term_months: row.renewalTermMonths,
            notice_days: row.noticeDays,
            canonical_fee_minor: row.canonicalFeeMinor,
            currency: row.currency,
            royalty_rule_id: row.royaltyRuleId,
            territory_id: row.territoryId,
            document_ref: row.documentRef,
          })
          .select('*')
          .maybeSingle()
      );
      return {
        ...row,
        id: String(data.id),
        tenantId: actor.tenantId,
        status: (data.status as typeof row.status) ?? row.status ?? 'draft',
        createdAt: String(data.created_at),
      };
    },
    async listAgreements(actor) {
      const { data, error } = await platform()
        .from('franchise_agreements')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .order('expiration_date', { ascending: true });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: String(row.tenant_id),
        franchiseeId: String(row.franchisee_id),
        unitIds: (row.unit_ids as string[]) ?? [],
        status: row.status as never,
        effectiveDate: String(row.effective_date).slice(0, 10),
        expirationDate: String(row.expiration_date).slice(0, 10),
        renewalType: row.renewal_type as never,
        renewalTermMonths: row.renewal_term_months == null ? null : Number(row.renewal_term_months),
        noticeDays: Number(row.notice_days),
        canonicalFeeMinor: Number(row.canonical_fee_minor),
        currency: String(row.currency),
        royaltyRuleId: row.royalty_rule_id ? String(row.royalty_rule_id) : null,
        territoryId: row.territory_id ? String(row.territory_id) : null,
        documentRef: (row.document_ref as never) ?? null,
        createdAt: String(row.created_at),
      }));
    },
    async insertRoyaltyRule(actor, row) {
      const data = await run(
        platform()
          .from('royalty_rules')
          .insert({
            id: row.id,
            tenant_id: actor.tenantId,
            name: row.name,
            basis: row.basis,
            percentage_bps: row.percentageBps,
            minimum_amount_minor: row.minimumAmountMinor,
            fixed_fee_minor: row.fixedFeeMinor,
            currency: row.currency,
            frequency: row.frequency,
            excluded_categories: row.excludedCategories,
            tax_treatment: row.taxTreatment,
            effective_from: row.effectiveFrom,
            effective_to: row.effectiveTo,
            version: row.version ?? 1,
          })
          .select('*')
          .maybeSingle()
      );
      return { ...row, tenantId: actor.tenantId, version: Number(data.version), id: String(data.id) };
    },
    async getRoyaltyRule(actor, id, version) {
      const { data, error } = await platform()
        .from('royalty_rules')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .eq('id', id)
        .eq('version', version)
        .maybeSingle();
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      if (!data) return null;
      return {
        id: String(data.id),
        tenantId: actor.tenantId,
        name: String(data.name),
        basis: data.basis as never,
        percentageBps: Number(data.percentage_bps),
        minimumAmountMinor: data.minimum_amount_minor == null ? null : Number(data.minimum_amount_minor),
        fixedFeeMinor: data.fixed_fee_minor == null ? null : Number(data.fixed_fee_minor),
        currency: String(data.currency),
        frequency: data.frequency as never,
        excludedCategories: (data.excluded_categories as string[]) ?? [],
        taxTreatment: data.tax_treatment as never,
        effectiveFrom: String(data.effective_from).slice(0, 10),
        effectiveTo: data.effective_to ? String(data.effective_to).slice(0, 10) : null,
        version: Number(data.version),
      };
    },
    async listRoyaltyRules(actor, id) {
      const { data, error } = await platform()
        .from('royalty_rules')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .eq('id', id)
        .order('version', { ascending: true });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      const rules = [];
      for (const row of data ?? []) {
        const mapped = await this.getRoyaltyRule(actor, String(row.id), Number(row.version));
        if (mapped) rules.push(mapped);
      }
      return rules;
    },
    async insertSalesReport(actor, row) {
      const data = await run(
        platform()
          .from('sales_reports')
          .insert({
            tenant_id: actor.tenantId,
            unit_id: row.unitId,
            period_start: row.periodStart,
            period_end: row.periodEnd,
            gross_sales_minor: row.grossSalesMinor,
            refunds_minor: row.refundsMinor,
            taxes_minor: row.taxesMinor,
            excluded_sales_minor: row.excludedSalesMinor,
            net_sales_minor: row.netSalesMinor,
            currency: row.currency,
            source: row.source,
            source_reference: row.sourceReference,
            status: row.status ?? 'submitted',
          })
          .select('*')
          .maybeSingle()
      );
      return { ...row, id: String(data.id), tenantId: actor.tenantId, status: (data.status as typeof row.status) ?? 'submitted' };
    },
    async listSalesReports(actor) {
      const { data, error } = await platform()
        .from('sales_reports')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .order('period_start', { ascending: false });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: actor.tenantId,
        unitId: String(row.unit_id),
        periodStart: String(row.period_start).slice(0, 10),
        periodEnd: String(row.period_end).slice(0, 10),
        grossSalesMinor: Number(row.gross_sales_minor),
        refundsMinor: Number(row.refunds_minor),
        taxesMinor: Number(row.taxes_minor),
        excludedSalesMinor: Number(row.excluded_sales_minor),
        netSalesMinor: Number(row.net_sales_minor),
        currency: String(row.currency),
        source: row.source as never,
        sourceReference: row.source_reference ? String(row.source_reference) : null,
        status: row.status as never,
      }));
    },
    async getSalesReport(actor, id) {
      const { data, error } = await platform()
        .from('sales_reports')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      if (!data) return null;
      return {
        id: String(data.id),
        tenantId: actor.tenantId,
        unitId: String(data.unit_id),
        periodStart: String(data.period_start).slice(0, 10),
        periodEnd: String(data.period_end).slice(0, 10),
        grossSalesMinor: Number(data.gross_sales_minor),
        refundsMinor: Number(data.refunds_minor),
        taxesMinor: Number(data.taxes_minor),
        excludedSalesMinor: Number(data.excluded_sales_minor),
        netSalesMinor: Number(data.net_sales_minor),
        currency: String(data.currency),
        source: data.source as never,
        sourceReference: data.source_reference ? String(data.source_reference) : null,
        status: data.status as never,
      };
    },
    async insertCalculation(actor, row) {
      const existing = await this.getCalculationByKey(actor, row.idempotencyKey);
      if (existing) return existing;
      const data = await run(
        platform()
          .from('royalty_calculations')
          .insert({
            id: row.id,
            tenant_id: actor.tenantId,
            unit_id: row.unitId,
            sales_report_id: row.salesReportId,
            royalty_rule_id: row.royaltyRuleId,
            rule_version: row.ruleVersion,
            currency: row.currency,
            inputs: row.inputs,
            royalty_due_minor: row.royaltyDueMinor,
            calculated_at: row.calculatedAt,
            idempotency_key: row.idempotencyKey,
          })
          .select('*')
          .maybeSingle()
      );
      return { ...row, id: String(data.id) };
    },
    async getCalculationByKey(actor, idempotencyKey) {
      const { data, error } = await platform()
        .from('royalty_calculations')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      if (!data) return null;
      return {
        id: String(data.id),
        tenantId: actor.tenantId,
        unitId: String(data.unit_id),
        salesReportId: String(data.sales_report_id),
        royaltyRuleId: String(data.royalty_rule_id),
        ruleVersion: Number(data.rule_version),
        currency: String(data.currency),
        inputs: data.inputs as never,
        royaltyDueMinor: Number(data.royalty_due_minor),
        calculatedAt: String(data.calculated_at),
        idempotencyKey: String(data.idempotency_key),
      };
    },
    async listCalculations(actor) {
      const { data, error } = await platform()
        .from('royalty_calculations')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .order('calculated_at', { ascending: false });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: actor.tenantId,
        unitId: String(row.unit_id),
        salesReportId: String(row.sales_report_id),
        royaltyRuleId: String(row.royalty_rule_id),
        ruleVersion: Number(row.rule_version),
        currency: String(row.currency),
        inputs: row.inputs as never,
        royaltyDueMinor: Number(row.royalty_due_minor),
        calculatedAt: String(row.calculated_at),
        idempotencyKey: String(row.idempotency_key),
      }));
    },
    async insertPayment(actor, row) {
      const data = await run(
        platform()
          .from('royalty_payments')
          .insert({
            tenant_id: actor.tenantId,
            calculation_id: row.calculationId,
            amount_minor: row.amountMinor,
            currency: row.currency,
            status: row.status,
            method: row.method,
            external_reference: row.externalReference,
            paid_at: row.paidAt,
          })
          .select('*')
          .maybeSingle()
      );
      return { ...row, id: String(data.id), tenantId: actor.tenantId };
    },
    async insertAuditTemplate(actor, row) {
      const data = await run(
        platform()
          .from('audit_templates')
          .insert({
            id: row.id,
            tenant_id: actor.tenantId,
            name: row.name,
            version: row.version,
            questions: row.questions,
          })
          .select('id')
          .maybeSingle()
      );
      return { id: String(data.id) };
    },
    async insertAudit(actor, row) {
      const data = await run(
        platform()
          .from('franchise_audits')
          .insert({
            tenant_id: actor.tenantId,
            unit_id: row.unitId,
            template_id: row.templateId,
            template_version: row.templateVersion,
            auditor: row.auditor,
            scheduled_at: row.scheduledAt,
            status: row.status ?? 'scheduled',
          })
          .select('*')
          .maybeSingle()
      );
      return {
        id: String(data.id),
        tenantId: actor.tenantId,
        unitId: row.unitId,
        templateId: row.templateId,
        templateVersion: row.templateVersion,
        auditor: row.auditor,
        scheduledAt: row.scheduledAt,
        performedAt: null,
        score: null,
        status: (data.status as 'scheduled') ?? 'scheduled',
      };
    },
    async insertFinding(actor, row) {
      const data = await run(
        platform()
          .from('audit_findings')
          .insert({
            tenant_id: actor.tenantId,
            audit_id: row.auditId,
            unit_id: row.unitId,
            severity: row.severity,
            standard_ref: row.standardRef,
            evidence: row.evidence,
            notes: row.notes,
          })
          .select('*')
          .maybeSingle()
      );
      return { ...row, id: String(data.id), tenantId: actor.tenantId };
    },
    async insertCorrectiveAction(actor, row) {
      const data = await run(
        platform()
          .from('corrective_actions')
          .insert({
            tenant_id: actor.tenantId,
            finding_id: row.findingId,
            unit_id: row.unitId,
            owner: row.owner,
            due_date: row.dueDate,
            status: row.status,
            resolution: row.resolution,
            evidence: row.evidence,
          })
          .select('*')
          .maybeSingle()
      );
      return { ...row, id: String(data.id), tenantId: actor.tenantId };
    },
    async listAudits(actor) {
      const { data, error } = await platform()
        .from('franchise_audits')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .order('scheduled_at', { ascending: false });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: actor.tenantId,
        unitId: String(row.unit_id),
        templateId: String(row.template_id),
        templateVersion: Number(row.template_version),
        auditor: String(row.auditor),
        scheduledAt: String(row.scheduled_at),
        performedAt: row.performed_at ? String(row.performed_at) : null,
        score: row.score == null ? null : Number(row.score),
        status: row.status as never,
      }));
    },
    async listFindings(actor, auditId) {
      const { data, error } = await platform()
        .from('audit_findings')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .eq('audit_id', auditId);
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: actor.tenantId,
        auditId: String(row.audit_id),
        unitId: String(row.unit_id),
        severity: row.severity as never,
        standardRef: row.standard_ref ? String(row.standard_ref) : null,
        evidence: (row.evidence as never) ?? null,
        notes: String(row.notes ?? ''),
      }));
    },
    async listCorrectiveActions(actor) {
      const { data, error } = await platform()
        .from('corrective_actions')
        .select('*')
        .eq('tenant_id', actor.tenantId)
        .order('due_date', { ascending: true });
      if (error) {
        if (isUndefinedTable(error)) throw schemaMissingError();
        throw error;
      }
      return (data ?? []).map((row) => ({
        id: String(row.id),
        tenantId: actor.tenantId,
        findingId: String(row.finding_id),
        unitId: String(row.unit_id),
        owner: String(row.owner),
        dueDate: String(row.due_date).slice(0, 10),
        status: row.status as never,
        resolution: row.resolution ? String(row.resolution) : null,
        evidence: (row.evidence as never) ?? null,
      }));
    },
    async insertChangeLog(input) {
      const { error } = await platform()
        .from('franchise_change_log')
        .insert({
          tenant_id: input.tenantId,
          actor_id: input.actorId,
          entity: input.entity,
          entity_id: input.entityId,
          action: input.action,
          before: input.before,
          after: input.after,
          reason: input.reason,
        });
      if (error && isUndefinedTable(error)) throw schemaMissingError();
      if (error) throw error;
    },
  };
  return store;
}
