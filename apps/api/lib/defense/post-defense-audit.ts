import { jsonError } from '../api-response';
import { HTTP_STATUS } from '../constants';
import { getServiceClient } from '../supabase';
import { tryEnqueueDefenseAuditJob, type TenantPlanForDefense } from './enqueue-defense-audit';
import type { CreateDefenseAuditBody } from './validation';

function mapTenantPlan(raw: string | null): TenantPlanForDefense | undefined {
  if (raw === 'startup' || raw === 'business' || raw === 'enterprise' || raw === 'demo') {
    return raw;
  }
  return undefined;
}

type DefenseTenantRow = {
  id: string;
  slug: string;
  plan: string | null;
  status: string;
};

async function loadDefenseTenantRow(tenantId: string): Promise<DefenseTenantRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .select('id, slug, plan, status')
    .eq('id', tenantId)
    .maybeSingle();

  if (error !== null || data === null) {
    return null;
  }
  return data as DefenseTenantRow;
}

type DefenseAuditRow = Record<string, unknown> & { id: string };

async function insertDefenseAuditScheduled(params: {
  tenantId: string;
  auditType: CreateDefenseAuditBody['audit_type'];
  framework: string | undefined;
  scopeText: string | null;
  scheduledAt: string;
}): Promise<{ audit: DefenseAuditRow } | { message: string }> {
  const db = getServiceClient();
  const { data: audit, error: insertErr } = await db
    .schema('defense')
    .from('audits')
    .insert({
      tenant_id: params.tenantId,
      audit_type: params.auditType,
      framework: params.framework ?? null,
      scope: params.scopeText,
      status: 'scheduled',
      scheduled_at: params.scheduledAt,
    })
    .select('*')
    .single();

  if (insertErr !== null || audit === null) {
    return { message: insertErr?.message ?? 'Insert failed' };
  }
  return { audit: audit as DefenseAuditRow };
}

/**
 * Cuerpo de POST /api/defense/audits (admin): valida tenant, inserta audit, encola orchestrator.
 */
export async function executePostDefenseAudit(parsed: CreateDefenseAuditBody): Promise<Response> {
  const tenant = await loadDefenseTenantRow(parsed.tenant_id);
  if (tenant === null) {
    return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
  }
  if (tenant.status !== 'active') {
    return jsonError('Tenant is not active', HTTP_STATUS.BAD_REQUEST);
  }

  const scopeText = parsed.scope !== undefined ? JSON.stringify(parsed.scope) : null;
  const scheduledAt = new Date().toISOString();
  const inserted = await insertDefenseAuditScheduled({
    tenantId: parsed.tenant_id,
    auditType: parsed.audit_type,
    framework: parsed.framework,
    scopeText,
    scheduledAt,
  });

  if ('message' in inserted) {
    return jsonError(inserted.message, HTTP_STATUS.INTERNAL_ERROR);
  }

  const { audit } = inserted;
  const enqueue = await tryEnqueueDefenseAuditJob({
    auditId: audit.id,
    tenantId: parsed.tenant_id,
    tenantSlug: tenant.slug,
    auditType: parsed.audit_type,
    framework: parsed.framework,
    scope: parsed.scope,
    plan: mapTenantPlan(tenant.plan),
  });

  return Response.json({
    success: true,
    audit,
    orchestrator: enqueue.ok ? { queued: true } : { queued: false, detail: enqueue.detail },
  });
}
