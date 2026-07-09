import { z } from 'zod';
import { jsonError, serverErrorLogged } from '../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { getServiceClient } from '../../../../../lib/supabase';
import { extractIp, logAuditEvent } from '../../../../../lib/audit';
import { checkRateLimit } from '../../../../../lib/rate-limiter';

const idParamSchema = z.string().uuid();
const tenantHeaderSchema = z.string().uuid();

async function fetchExistingKey(
  id: string,
  tenantId: string
): Promise<{
  data: { id: string } | null;
  error: unknown;
}> {
  return getServiceClient()
    .schema('platform')
    .from('api_keys')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();
}

async function handleDeleteSecurity(request: Request): Promise<{
  ip?: string | null;
  error?: Response;
}> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `v1-keys-delete:${ip}` : 'v1-keys-delete:anonymous');
  if (!rateLimit.allowed) {
    return { error: jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS) };
  }

  const authError = await requireAdminAccess(request);
  if (authError) return { error: authError };

  return { ip };
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const security = await handleDeleteSecurity(request);
  if (security.error) return security.error;
  const { ip } = security;

  const tenantHeader = request.headers.get('x-tenant-id');
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? '');
  if (!tenantParsed.success) {
    return jsonError('Invalid or missing x-tenant-id header', HTTP_STATUS.BAD_REQUEST);
  }

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return jsonError('Invalid key id', HTTP_STATUS.BAD_REQUEST);
  }

  const { data: existing, error: fetchError } = await fetchExistingKey(
    idParsed.data,
    tenantParsed.data
  );

  if (fetchError) {
    return serverErrorLogged('DELETE v1/keys fetch:', fetchError);
  }
  if (!existing) {
    return jsonError('Not found', HTTP_STATUS.NOT_FOUND);
  }

  const { error: updateError } = await revokeApiKey(idParsed.data, tenantParsed.data);

  if (updateError) {
    return serverErrorLogged('DELETE v1/keys update:', updateError);
  }

  void logAuditEvent({
    tenant_slug: tenantParsed.data,
    action: 'revoke_api_key',
    resource: `api_key:${idParsed.data}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
  });

  return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
}

async function revokeApiKey(id: string, tenantId: string): Promise<{ error: unknown }> {
  return getServiceClient()
    .schema('platform')
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);
}
