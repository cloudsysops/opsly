import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { jsonError, serverErrorLogged } from '../../../../lib/api-response';
import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { getServiceClient } from '../../../../lib/supabase';
import { formatZodError } from '../../../../lib/validation';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { checkRateLimit } from '../../../../lib/rate-limiter';

const tenantHeaderSchema = z.string().uuid();

const createBodySchema = z.object({
  name: z.string().min(1).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `v1-keys-list:${ip}` : 'v1-keys-list:anonymous');
  if (!rateLimit.allowed) {
    return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const tenantHeader = request.headers.get('x-tenant-id');
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? '');
  if (!tenantParsed.success) {
    return jsonError('Invalid or missing x-tenant-id header', HTTP_STATUS.BAD_REQUEST);
  }

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

async function parseAndValidateBody(request: Request): Promise<{
  data?: z.infer<typeof createBodySchema>;
  error?: Response;
}> {
  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.length > 0) {
      body = JSON.parse(raw) as unknown;
    }
  } catch {
    return { error: jsonError('Invalid JSON body', HTTP_STATUS.BAD_REQUEST) };
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return { error: jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST) };
  }
  return { data: parsed.data };
}

async function handlePostSecurity(request: Request): Promise<{
  ip?: string | null;
  error?: Response;
}> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `v1-keys-create:${ip}` : 'v1-keys-create:anonymous');
  if (!rateLimit.allowed) {
    return { error: jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS) };
  }

  const authError = await requireAdminAccess(request);
  if (authError) return { error: authError };

  return { ip };
}

export async function POST(request: Request): Promise<Response> {
  const security = await handlePostSecurity(request);
  if (security.error) return security.error;
  const { ip } = security;

  const tenantHeader = request.headers.get('x-tenant-id');
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? '');
  if (!tenantParsed.success) {
    return jsonError('Invalid or missing x-tenant-id header', HTTP_STATUS.BAD_REQUEST);
  }

  const validation = await parseAndValidateBody(request);
  if (validation.error) return validation.error;

  const KEY_BYTES = 32;
  const PREFIX_LEN = 8;
  const secretHex = randomBytes(KEY_BYTES).toString('hex');
  const fullKey = `opsly_${secretHex}`;
  const key_prefix = `opsly_${secretHex.slice(0, PREFIX_LEN)}`;
  const key_hash = createHash('sha256').update(fullKey).digest('hex');

  const { data, error } = await insertApiKey(
    tenantParsed.data,
    key_hash,
    key_prefix,
    validation.data?.name ?? null
  );

  if (error || !data) {
    return serverErrorLogged('POST v1/keys:', error ?? new Error('insert failed'));
  }

  void logAuditEvent({
    tenant_slug: tenantParsed.data,
    action: 'create_api_key',
    resource: `api_key:${data.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { name: data.name, key_prefix: data.key_prefix },
  });

  return Response.json({
    id: data.id,
    key: fullKey,
    key_prefix: data.key_prefix,
    name: data.name,
    created_at: data.created_at,
  });
}

async function insertApiKey(
  tenantId: string,
  key_hash: string,
  key_prefix: string,
  name: string | null
): Promise<{
  data: { id: string; key_prefix: string; name: string | null; created_at: string } | null;
  error: unknown;
}> {
  return getServiceClient()
    .schema('platform')
    .from('api_keys')
    .insert({
      tenant_id: tenantId,
      key_hash,
      key_prefix,
      name,
    })
    .select('id, key_prefix, name, created_at')
    .single();
}
