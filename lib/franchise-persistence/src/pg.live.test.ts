import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFranchiseService } from './service.js';
import { createPgFranchiseStore } from './pg-store.js';
import { asAuthenticated, bootstrapFranchiseDb, releaseAuthenticated, testDatabaseUrl, type Harness } from './test-bootstrap.js';
import type { FranchiseActor } from './actor.js';
import type { RoyaltyRule, TerritoryGeometry } from '@intcloudsysops/franchise-core';

function actor(h: Harness, patch: Partial<FranchiseActor> = {}): FranchiseActor {
  return {
    tenantId: h.tenantA,
    tenantSlug: 'peskids',
    actorId: h.userNetwork,
    role: 'franchise_network_admin',
    assignedUnitIds: [],
    requestId: 'req-live',
    ...patch,
  };
}

const municipality: TerritoryGeometry = {
  kind: 'municipality',
  countryCode: 'CO',
  adminName: 'Rionegro',
};

describe('franchise persistence live postgres', () => {
  let url: string;
  let h: Harness;
  let service: ReturnType<typeof createFranchiseService>;

  beforeAll(async () => {
    const resolved = testDatabaseUrl();
    if (!resolved) {
      throw new Error('FRANCHISE_TEST_DATABASE_URL / POSTGRES_URL / local docker postgres:15 is required');
    }
    url = resolved;
    h = await bootstrapFranchiseDb(url);
    const store = createPgFranchiseStore(async (text, values = []) => {
      const result = await h.pool.query(text, values);
      return result.rows as never;
    });
    service = createFranchiseService(store);
  }, 120_000);

  afterAll(async () => {
    await h?.pool.end();
  });

  it('replays 0098+0099+0100 without destroying 0090-shaped units', async () => {
    const sql0098 = (await import('node:fs')).readFileSync(
      new URL('../../../supabase/migrations/0098_franchise_core.sql', import.meta.url),
      'utf8'
    );
    const sql0099 = (await import('node:fs')).readFileSync(
      new URL('../../../supabase/migrations/0099_franchise_core_rls.sql', import.meta.url),
      'utf8'
    );
    const sql0100 = (await import('node:fs')).readFileSync(
      new URL('../../../supabase/migrations/0100_franchise_opening_workflows.sql', import.meta.url),
      'utf8'
    );
    await h.pool.query(sql0098);
    await h.pool.query(sql0099);
    await h.pool.query(sql0100);
    const units = await h.pool.query<{ code: string }>(
      `SELECT code FROM platform.franchise_units WHERE tenant_id = $1 ORDER BY code`,
      [h.tenantA]
    );
    expect(units.rows.map((r) => r.code)).toEqual(['domicilios-peskids', 'llanogrande-principal']);
  });

  it('persists territory, agreement, sales, immutable royalty, payment, audit lifecycle', async () => {
    const network = actor(h);
    const franchisee = await createPgFranchiseStore(async (text, values = []) => {
      const result = await h.pool.query(text, values);
      return result.rows as never;
    }).insertFranchisee(network, {
      tenantId: h.tenantA,
      legalName: 'Demo Franchisee',
      taxId: null,
      status: 'active',
      primaryContact: { name: 'Ana', email: 'ana@example.com', phone: null },
    });

    const { territory, conflicts } = await service.createTerritory(network, {
      tenantId: h.tenantA,
      name: 'Rionegro sede',
      geometry: municipality,
      exclusive: true,
      exclusiveFor: 'fixed_location',
      validFrom: '2026-01-01',
      validTo: null,
      unitId: h.unitA,
    });
    expect(territory.id).toBeTruthy();
    expect(conflicts).toEqual([]);

    const listed = await service.listTerritories(network);
    expect(listed.territories.some((row) => row.id === territory.id)).toBe(true);

    const rule: RoyaltyRule = {
      id: crypto.randomUUID(),
      tenantId: h.tenantA,
      name: 'Standard 5%',
      basis: 'gross_sales',
      percentageBps: 500,
      minimumAmountMinor: null,
      fixedFeeMinor: 0,
      currency: 'COP',
      frequency: 'monthly',
      excludedCategories: [],
      taxTreatment: 'unspecified',
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-06-30',
      version: 1,
    };
    const store = createPgFranchiseStore(async (text, values = []) => {
      const result = await h.pool.query(text, values);
      return result.rows as never;
    });
    const persistedRule = await store.insertRoyaltyRule(network, rule);

    const { agreement } = await service.createAgreement(network, {
      tenantId: h.tenantA,
      franchiseeId: franchisee.id,
      unitIds: [h.unitA],
      effectiveDate: '2026-01-01',
      expirationDate: new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10),
      renewalType: 'franchisor_discretion',
      renewalTermMonths: 12,
      noticeDays: 90,
      canonicalFeeMinor: 0,
      currency: 'COP',
      royaltyRuleId: persistedRule.id,
      territoryId: territory.id,
      documentRef: null,
    });
    expect(agreement.id).toBeTruthy();
    const agreements = await service.listAgreements(network);
    expect(agreements.some((row) => row.id === agreement.id)).toBe(true);

    const { report } = await service.reportSales(network, {
      tenantId: h.tenantA,
      unitId: h.unitA,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossSalesMinor: 10_000_000,
      refundsMinor: 0,
      taxesMinor: 0,
      excludedSalesMinor: 0,
      netSalesMinor: 10_000_000,
      currency: 'COP',
      source: 'manual',
      sourceReference: 'june-manual',
    });
    const again = await service.reportSales(network, {
      tenantId: h.tenantA,
      unitId: h.unitA,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      grossSalesMinor: 10_000_000,
      refundsMinor: 0,
      taxesMinor: 0,
      excludedSalesMinor: 0,
      netSalesMinor: 10_000_000,
      currency: 'COP',
      source: 'manual',
      sourceReference: 'june-manual',
    });
    expect(again.report.id).toBe(report.id);

    const calc1 = await service.calculateFromReport(network, {
      reportId: report.id,
      ruleId: persistedRule.id,
      ruleVersion: 1,
    });
    expect(calc1.calculation.royaltyDueMinor).toBe(500_000);
    expect(calc1.calculation.ruleVersion).toBe(1);

    const v2 = await service.createRuleVersion(network, persistedRule, {
      percentageBps: 600,
      effectiveFrom: '2026-07-01',
      effectiveTo: null,
    });
    expect(v2.version).toBe(2);

    const calc1b = await service.calculateFromReport(network, {
      reportId: report.id,
      ruleId: persistedRule.id,
      ruleVersion: 1,
    });
    expect(calc1b.calculation.royaltyDueMinor).toBe(500_000);
    expect(calc1b.calculation.id).toBe(calc1.calculation.id);

    await expect(
      h.pool.query(
        `UPDATE platform.royalty_calculations SET royalty_due_minor = 1 WHERE id = $1`,
        [calc1.calculation.id]
      )
    ).rejects.toThrow(/immutable/i);

    await expect(
      h.pool.query(`UPDATE platform.royalty_rules SET percentage_bps = 1 WHERE id = $1 AND version = 1`, [
        persistedRule.id,
      ])
    ).rejects.toThrow(/immutable/i);

    const payment = await service.recordPayment(network, {
      calculationId: calc1.calculation.id,
      amountMinor: 500_000,
      currency: 'COP',
      method: 'manual',
      externalReference: 'wire-1',
    });
    expect(payment.status).toBe('paid');

    const template = await store.insertAuditTemplate(network, {
      name: 'Safety',
      version: 1,
      questions: [{ id: 'q1', prompt: 'Safe?' }],
    });
    const audit = await service.createAudit(network, {
      tenantId: h.tenantA,
      unitId: h.unitA,
      templateId: template.id,
      templateVersion: 1,
      auditor: 'ops',
      scheduledAt: new Date().toISOString(),
      status: 'scheduled',
    });
    const finding = await service.addFinding(network, {
      auditId: audit.id,
      unitId: h.unitA,
      severity: 'high',
      notes: 'Missing signage',
      standardRef: 'SAFE-1',
    });
    const action = await service.addCorrectiveAction(network, {
      findingId: finding.id,
      unitId: h.unitA,
      owner: 'director',
      dueDate: '2026-09-01',
    });
    expect(action.action.status).toBe('open');
  });

  it('rejects negative amounts and mismatched agreement tenants', async () => {
    await expect(
      h.pool.query(
        `INSERT INTO platform.sales_reports
           (tenant_id, unit_id, period_start, period_end, gross_sales_minor, net_sales_minor, source)
         VALUES ($1,$2,'2026-01-01','2026-01-31',-1,0,'manual')`,
        [h.tenantA, h.unitA]
      )
    ).rejects.toThrow();

    const otherFranchisee = await h.pool.query<{ id: string }>(
      `INSERT INTO platform.franchisees (tenant_id, legal_name, status)
       VALUES ($1,'Acme Corp','active') RETURNING id`,
      [h.tenantB]
    );
    await expect(
      h.pool.query(
        `INSERT INTO platform.franchise_agreements
           (tenant_id, franchisee_id, unit_ids, effective_date, expiration_date)
         VALUES ($1,$2,$3,'2026-01-01','2026-12-31')`,
        [h.tenantA, otherFranchisee.rows[0].id, [h.unitA]]
      )
    ).rejects.toThrow(/mismatch/i);
  });

  it('RLS: tenant A cannot read tenant B; unit A cannot read unit B royalties; teacher denied; auditor audits only', async () => {
    await h.pool.query(
      `INSERT INTO platform.sales_reports
         (tenant_id, unit_id, period_start, period_end, gross_sales_minor, net_sales_minor, currency, source, source_reference, status)
       VALUES ($1,$2,'2026-02-01','2026-02-28',100,100,'COP','pos','unit-b-feb','submitted')`,
      [h.tenantA, h.unitB]
    );
    await h.pool.query(
      `INSERT INTO platform.sales_reports
         (tenant_id, unit_id, period_start, period_end, gross_sales_minor, net_sales_minor, currency, source, source_reference, status)
       VALUES ($1,$2,'2026-02-01','2026-02-28',999,999,'COP','pos','acme-feb','submitted')`,
      [h.tenantB, h.unitOtherTenant]
    );

    const unitBFranchisee = await h.pool.query<{ id: string }>(
      `INSERT INTO platform.franchisees (tenant_id, legal_name, status)
       VALUES ($1,'Unit B Holder','active') RETURNING id`,
      [h.tenantA]
    );
    await h.pool.query(
      `INSERT INTO platform.franchise_agreements
         (tenant_id, franchisee_id, unit_ids, effective_date, expiration_date, status)
       VALUES ($1,$2,$3,'2026-01-01','2026-12-31','active')`,
      [h.tenantA, unitBFranchisee.rows[0].id, [h.unitB]]
    );

    const otherTenant = await asAuthenticated(h.pool, { userId: h.userOtherTenant, role: 'owner' });
    try {
      const cross = await otherTenant.query(
        `SELECT id FROM platform.sales_reports WHERE tenant_id = $1`,
        [h.tenantA]
      );
      expect(cross.rowCount).toBe(0);
      await expect(
        otherTenant.query(
          `INSERT INTO platform.sales_reports
             (tenant_id, unit_id, period_start, period_end, gross_sales_minor, net_sales_minor, source)
           VALUES ($1,$2,'2026-03-01','2026-03-31',1,1,'manual')`,
          [h.tenantA, h.unitA]
        )
      ).rejects.toThrow();
    } finally {
      await releaseAuthenticated(otherTenant);
    }

    const unitAdmin = await asAuthenticated(h.pool, {
      userId: h.userUnitA,
      role: 'franchise_admin',
      jwtRole: 'franchise_admin',
    });
    try {
      const own = await unitAdmin.query(`SELECT unit_id FROM platform.sales_reports`);
      expect(own.rows.every((row) => row.unit_id === h.unitA)).toBe(true);
      expect(own.rows.some((row) => row.unit_id === h.unitB)).toBe(false);
      const agreements = await unitAdmin.query(`SELECT unit_ids FROM platform.franchise_agreements`);
      expect(agreements.rows.every((row) => (row.unit_ids as string[]).includes(h.unitA))).toBe(true);
      expect(agreements.rows.some((row) => (row.unit_ids as string[]).includes(h.unitB))).toBe(false);
      const upd = await unitAdmin.query(
        `UPDATE platform.royalty_calculations SET royalty_due_minor = 1 WHERE unit_id = $1`,
        [h.unitB]
      );
      expect(upd.rowCount).toBe(0);
    } finally {
      await releaseAuthenticated(unitAdmin);
    }

    const teacher = await asAuthenticated(h.pool, { userId: h.userTeacher, role: 'teacher' });
    try {
      const royalties = await teacher.query(`SELECT id FROM platform.royalty_calculations`);
      expect(royalties.rowCount).toBe(0);
      const agreements = await teacher.query(`SELECT id FROM platform.franchise_agreements`);
      expect(agreements.rowCount).toBe(0);
      await expect(
        teacher.query(
          `INSERT INTO platform.sales_reports
             (tenant_id, unit_id, period_start, period_end, gross_sales_minor, net_sales_minor, source)
           VALUES ($1,$2,'2026-04-01','2026-04-30',1,1,'manual')`,
          [h.tenantA, h.unitA]
        )
      ).rejects.toThrow();
    } finally {
      await releaseAuthenticated(teacher);
    }

    const network = await asAuthenticated(h.pool, { userId: h.userNetwork, role: 'owner' });
    try {
      const allUnits = await network.query(
        `SELECT DISTINCT unit_id FROM platform.sales_reports WHERE tenant_id = $1`,
        [h.tenantA]
      );
      const ids = allUnits.rows.map((row) => row.unit_id);
      expect(ids).toContain(h.unitA);
      expect(ids).toContain(h.unitB);
    } finally {
      await releaseAuthenticated(network);
    }

    const auditor = await asAuthenticated(h.pool, { userId: h.userAuditor, role: 'auditor' });
    try {
      const calcs = await auditor.query(`SELECT id FROM platform.royalty_calculations`);
      expect(calcs.rowCount).toBe(0);
      const audits = await auditor.query(`SELECT id FROM platform.franchise_audits`);
      expect(audits.rowCount).toBeGreaterThanOrEqual(0);
    } finally {
      await releaseAuthenticated(auditor);
    }

    const support = await asAuthenticated(h.pool, { userId: h.userSupport, role: 'support' });
    try {
      const reports = await support.query(`SELECT unit_id FROM platform.sales_reports`);
      expect(reports.rows.every((row) => row.unit_id === h.unitA)).toBe(true);
    } finally {
      await releaseAuthenticated(support);
    }
  });

  it('application ACL denies teacher royalties even with service-role store', async () => {
    const teacher = actor(h, { actorId: h.userTeacher, role: 'teacher', assignedUnitIds: [h.unitA] });
    await expect(service.listRoyalties(teacher)).rejects.toMatchObject({ status: 403 });
    await expect(service.listAgreements(teacher)).rejects.toMatchObject({ status: 403 });
  });

  it('blocks unit activation until required opening tasks complete', async () => {
    const network = actor(h);
    const started = await service.startOpening(network, h.unitA);
    expect(started.canActivate).toBe(false);
    await expect(service.activateUnit(network, h.unitA)).rejects.toMatchObject({
      code: 'opening_blocked',
      status: 409,
    });
    for (const task of started.checklist.tasks.filter((row) => row.required)) {
      await service.completeOpeningTask(network, {
        taskId: task.id,
        status: 'completed',
        evidenceUri: `https://files.example.test/${task.phase}.pdf`,
      });
    }
    const activated = await service.activateUnit(network, h.unitA);
    expect(activated.event.name).toBe('unit.activated');
    const unit = await h.pool.query<{ status: string; opening_status: string | null }>(
      `SELECT status, opening_status FROM platform.franchise_units WHERE id = $1`,
      [h.unitA]
    );
    expect(unit.rows[0].status).toBe('active');
    expect(unit.rows[0].opening_status).toBeNull();
  });

  it('RLS: teacher cannot read opening checklists; unit A cannot see unit B opening', async () => {
    const network = actor(h);
    await service.startOpening(network, h.unitB);
    const teacher = await asAuthenticated(h.pool, { userId: h.userTeacher, role: 'teacher' });
    try {
      const rows = await teacher.query(`SELECT id FROM platform.opening_checklists`);
      expect(rows.rowCount).toBe(0);
      await expect(
        teacher.query(
          `INSERT INTO platform.opening_checklists (tenant_id, unit_id) VALUES ($1,$2)`,
          [h.tenantA, h.unitA]
        )
      ).rejects.toThrow();
    } finally {
      await releaseAuthenticated(teacher);
    }
    const unitAdmin = await asAuthenticated(h.pool, {
      userId: h.userUnitA,
      role: 'franchise_admin',
      jwtRole: 'franchise_admin',
    });
    try {
      const seen = await unitAdmin.query(`SELECT unit_id FROM platform.opening_checklists`);
      expect(seen.rows.every((row) => row.unit_id === h.unitA)).toBe(true);
      expect(seen.rows.some((row) => row.unit_id === h.unitB)).toBe(false);
    } finally {
      await releaseAuthenticated(unitAdmin);
    }
    const otherTenant = await asAuthenticated(h.pool, { userId: h.userOtherTenant, role: 'owner' });
    try {
      const cross = await otherTenant.query(`SELECT id FROM platform.opening_checklists WHERE tenant_id = $1`, [
        h.tenantA,
      ]);
      expect(cross.rowCount).toBe(0);
    } finally {
      await releaseAuthenticated(otherTenant);
    }
  });
});
