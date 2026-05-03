import { jsonError } from '../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { getServiceClient } from '../../../../../lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, ctx: RouteParams): Promise<Response> {
  const auth = await requireAdminAccessUnlessDemoRead(request);
  if (auth !== null) {
    return auth;
  }

  const { id } = await ctx.params;
  if (!id || id.length < 10) {
    return jsonError('Invalid id', HTTP_STATUS.BAD_REQUEST);
  }

  const db = getServiceClient();

  const { data: audit, error: auditErr } = await db
    .schema('defense')
    .from('audits')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (auditErr) {
    return jsonError(auditErr.message, HTTP_STATUS.INTERNAL_ERROR);
  }
  if (!audit) {
    return jsonError('Audit not found', HTTP_STATUS.NOT_FOUND);
  }

  const { data: vulnerabilities, error: vulnErr } = await db
    .schema('defense')
    .from('vulnerabilities')
    .select('*')
    .eq('audit_id', id)
    .order('created_at', { ascending: true });

  if (vulnErr) {
    return jsonError(vulnErr.message, HTTP_STATUS.INTERNAL_ERROR);
  }

  return Response.json({
    ...audit,
    vulnerabilities: vulnerabilities ?? [],
  });
}
