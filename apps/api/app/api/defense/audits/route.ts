import { jsonError } from '../../../../lib/api-response';
import { executePostDefenseAudit } from '../../../../lib/defense/post-defense-audit';
import { createDefenseAuditBodySchema } from '../../../../lib/defense/validation';
import { DEFENSE_API, HTTP_STATUS } from '../../../../lib/constants';
import { requireAdminAccess, requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { getServiceClient } from '../../../../lib/supabase';

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
    .limit(DEFENSE_API.AUDITS_LIST_MAX);
  if (tenantId !== undefined && tenantId.length > 0) {
    q = q.eq('tenant_id', tenantId);
  }

  const { data, error } = await q;
  if (error !== null) {
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

  return executePostDefenseAudit(parsed.data);
}
