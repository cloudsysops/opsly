import { jsonError } from '../../../../../../lib/api-response';
import { remediateVulnerabilityBodySchema } from '../../../../../../lib/defense/validation';
import { DEFENSE_API, HTTP_STATUS } from '../../../../../../lib/constants';
import { requireAdminAccess } from '../../../../../../lib/auth';
import { getServiceClient } from '../../../../../../lib/supabase';
import { extractIp, logAuditEvent } from '../../../../../../lib/audit';
import { checkRateLimit } from '../../../../../../lib/rate-limiter';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, ctx: RouteParams): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `defense-vulnerability-remediate:${ip}` : 'defense-vulnerability-remediate:anon');
  if (!rateLimit.allowed) {
    return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  const { id } = await ctx.params;
  if (!id || id.length < DEFENSE_API.MIN_PATH_ID_LEN) {
    return jsonError('Invalid id', HTTP_STATUS.BAD_REQUEST);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }

  const parsed = remediateVulnerabilityBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(
      parsed.error.flatten().formErrors.join('; ') || 'Invalid body',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const { remediation_evidence: evidence, notes } = parsed.data;
  const db = getServiceClient();

  const mergedEvidence = [evidence, notes].filter((s) => s && s.length > 0).join('\n---\n') || null;

  const { data: updated, error } = await db
    .schema('defense')
    .from('vulnerabilities')
    .update({
      status: 'fixed',
      fixed_at: new Date().toISOString(),
      evidence: mergedEvidence,
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    return jsonError(error.message, HTTP_STATUS.INTERNAL_ERROR);
  }
  if (!updated) {
    return jsonError('Vulnerability not found', HTTP_STATUS.NOT_FOUND);
  }

  void logAuditEvent({
    tenant_slug: updated.tenant_id,
    action: 'REMEDIATE_VULNERABILITY',
    resource: `defense:vulnerabilities:${id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { status: 'fixed' },
  });

  return Response.json({
    success: true,
    vulnerability: updated,
    verification: { queued: false, note: 'Verification job not yet wired' },
  });
}
