import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { jsonError, serverErrorLogged } from '../../../../lib/api-response';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../lib/supabase';
import { formatZodError } from '../../../../lib/validation';

const tenantHeaderSchema = z.string().uuid();

const createBodySchema = z.object({
  name: z.string().min(1).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const tenantHeader = request.headers.get('x-tenant-id');
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? '');
  if (!tenantParsed.success) {
    return jsonError('Invalid or missing x-tenant-id header', HTTP_STATUS.BAD_REQUEST);
  }

  // Audit logging for key list access
  void logAuditEvent({
    action: 'LIST_KEYS',
    resource: '/api/v1/keys',
    ip: extractIp(request),
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { tenant_id: tenantParsed.data },
  });

  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('api_keys')
    .select('id, key_prefix, name, last_used_at, created_at, revoked_at')
    .eq('tenant_id', tenantParsed.data)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return serverErrorLogged('GET v1/keys:', error);
  }

  return Response.json({ data: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
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
  const rateLimit = await checkRateLimit(ip ? `v1-keys-create:${ip}` : 'v1-keys-create:anonymous');
  if (!rateLimit.allowed) {
    return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.length > 0) {
      body = JSON.parse(raw) as unknown;
    }
  } catch {
    return jsonError('Invalid JSON body', HTTP_STATUS.BAD_REQUEST);
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const secretHex = randomBytes(32).toString('hex');
  const fullKey = `opsly_${secretHex}`;
  const key_prefix = `opsly_${secretHex.slice(0, 8)}`;
  const key_hash = createHash('sha256').update(fullKey).digest('hex');

  const { data, error } = await getServiceClient()
    .schema('platform')
    .from('api_keys')
    .insert({
      tenant_id: tenantParsed.data,
      key_hash,
      key_prefix,
      name: parsed.data.name ?? null,
    })
    .select('id, key_prefix, name, created_at')
    .single();

  if (error || !data) {
    return serverErrorLogged('POST v1/keys:', error ?? new Error('insert failed'));
  }

  // Audit logging for successful key creation
  void logAuditEvent({
    action: 'CREATE_KEY',
    resource: '/api/v1/keys',
    status_code: HTTP_STATUS.OK,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: {
      tenant_id: tenantParsed.data,
      key_id: data.id,
      name: data.name,
    },
  });

  return Response.json({
    id: data.id,
    key: fullKey,
    key_prefix: data.key_prefix,
    name: data.name,
    created_at: data.created_at,
  });
}
