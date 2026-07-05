import { z } from 'zod';
import { jsonError, serverErrorLogged } from '../../../../../lib/api-response';
import { extractIp, logAuditEvent } from '../../../../../lib/audit';
import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { checkRateLimit } from '../../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../../lib/supabase';

const idParamSchema = z.string().uuid();
const tenantHeaderSchema = z.string().uuid();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const tenantHeader = request.headers.get('x-tenant-id');
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? '');
  if (!tenantParsed.success) {
    return jsonError('Invalid or missing x-tenant-id header', HTTP_STATUS.BAD_REQUEST);
  }

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `v1-keys-delete:${ip}` : 'v1-keys-delete:anonymous');
  if (!rateLimit.allowed) {
    return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError('Invalid key id', HTTP_STATUS.BAD_REQUEST);
  }

  const { data: existing, error: fetchError } = await getServiceClient()
    .schema('platform')
    .from('api_keys')
    .select('id')
    .eq('id', idParsed.data)
    .eq('tenant_id', tenantParsed.data)
    .maybeSingle();

  if (fetchError) {
    return serverErrorLogged('DELETE v1/keys fetch:', fetchError);
  }
  if (!existing) {
    return jsonError('Not found', HTTP_STATUS.NOT_FOUND);
  }

  const { error: updateError } = await getServiceClient()
    .schema('platform')
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', idParsed.data)
    .eq('tenant_id', tenantParsed.data);

  if (updateError) {
    return serverErrorLogged('DELETE v1/keys update:', updateError);
  }

  // Audit logging for successful key revocation
  void logAuditEvent({
    action: 'REVOKE_KEY',
    resource: `/api/v1/keys/${idParsed.data}`,
    status_code: HTTP_STATUS.NO_CONTENT,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: {
      tenant_id: tenantParsed.data,
      key_id: idParsed.data,
    },
  });

  return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
}
