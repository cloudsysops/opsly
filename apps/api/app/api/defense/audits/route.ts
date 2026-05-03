import { jsonError } from '../../../../lib/api-response';
import { tryEnqueueDefenseAuditJob } from '../../../../lib/defense/enqueue-defense-audit';
import { createDefenseAuditBodySchema } from '../../../../lib/defense/validation';
import { HTTP_STATUS } from '../../../../lib/constants';
import { requireAdminAccess, requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { getServiceClient } from '../../../../lib/supabase';

function mapTenantPlan(
  raw: string | null
): 'startup' | 'business' | 'enterprise' | 'demo' | undefined {
  if (raw === 'startup' || raw === 'business' || raw === 'enterprise' || raw === 'demo') {
    return raw;
  }
  return undefined;
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccessUnlessDemoRead(request);
  if (auth !== null) {
    return auth;
  }

  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id')?.trim();

  const db = getServiceClient();
  let q = db
    .schema('defense')
    .from('audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (tenantId && tenantId.length > 0) {
    q = q.eq('tenant_id', tenantId);
  }

  const { data, error } = await q;
  if (error) {
    return jsonError(error.message, HTTP_STATUS.INTERNAL_ERROR);
  }

  return Response.json({ audits: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError('Invalid JSON', HTTP_STATUS.BAD_REQUEST);
  }

  const parsed = createDefenseAuditBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      parsed.error.flatten().formErrors.join('; ') || 'Invalid body',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const { tenant_id: tenantId, audit_type: auditType, framework, scope } = parsed.data;
  const db = getServiceClient();

  const { data: tenant, error: tenantErr } = await db
    .schema('platform')
    .from('tenants')
    .select('id, slug, plan, status')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantErr || !tenant) {
    return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
  }

  if (tenant.status !== 'active') {
    return jsonError('Tenant is not active', HTTP_STATUS.BAD_REQUEST);
  }

  const scopeText = scope !== undefined ? JSON.stringify(scope) : null;
  const scheduledAt = new Date().toISOString();

  const { data: audit, error: insertErr } = await db
    .schema('defense')
    .from('audits')
    .insert({
      tenant_id: tenantId,
      audit_type: auditType,
      framework: framework ?? null,
      scope: scopeText,
      status: 'scheduled',
      scheduled_at: scheduledAt,
    })
    .select('*')
    .single();

  if (insertErr || !audit) {
    return jsonError(insertErr?.message ?? 'Insert failed', HTTP_STATUS.INTERNAL_ERROR);
  }

  const enqueue = await tryEnqueueDefenseAuditJob({
    auditId: audit.id,
    tenantId,
    tenantSlug: tenant.slug,
    auditType,
    framework,
    scope,
    plan: mapTenantPlan(tenant.plan),
  });

  return Response.json({
    success: true,
    audit,
    orchestrator: enqueue.ok ? { queued: true } : { queued: false, detail: enqueue.detail },
  });
}
