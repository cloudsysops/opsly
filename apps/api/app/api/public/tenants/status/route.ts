import { z } from 'zod';
import { jsonError, serverErrorLogged, tryRoute } from '../../../../../lib/api-response';
import { extractIp, logAuditEvent } from '../../../../../lib/audit';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { sanitizePublicPortalServices } from '../../../../../lib/portal-me';
import { checkRateLimit } from '../../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../../lib/supabase';
import type { Json } from '../../../../../lib/supabase/types';
import { formatZodError } from '../../../../../lib/validation';

const querySchema = z.object({
  email: z.string().email(),
});

const MIN_LOCAL_LENGTH_FOR_FULL_MASK = 2;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'invalid_email';
  if (local.length <= MIN_LOCAL_LENGTH_FOR_FULL_MASK) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function auditStatusRetrieve(
  action: 'RETRIEVE_STATUS' | 'RETRIEVE_STATUS_FAILED',
  maskedEmail: string,
  ip: string | null,
  userAgent: string | undefined,
  tenant?: { slug: string; status: string }
): void {
  void logAuditEvent({
    tenant_slug: tenant?.slug,
    action,
    resource: tenant ? `public:tenant_status:${tenant.slug}` : 'public:tenant_status',
    ip,
    user_agent: userAgent,
    metadata: {
      email: maskedEmail,
      found: !!tenant,
      ...(tenant ? { status: tenant.status } : {}),
    },
  });
}

export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/public/tenants/status', async () => {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const ip = extractIp(request);
    const rateLimit = await checkRateLimit(ip ? `public-status:${ip}` : 'public-status:anonymous');
    if (!rateLimit.allowed) {
      return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    const { data: tenant, error } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('status, progress, services, slug')
      .eq('owner_email', parsed.data.email)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return serverErrorLogged('public tenant status:', error);
    }

    const maskedEmail = maskEmail(parsed.data.email);
    const userAgent = request.headers.get('user-agent') ?? undefined;

    if (!tenant) {
      auditStatusRetrieve('RETRIEVE_STATUS_FAILED', maskedEmail, ip, userAgent);
      return Response.json({ status: 'not_found' as const });
    }

    auditStatusRetrieve('RETRIEVE_STATUS', maskedEmail, ip, userAgent, tenant);

    return Response.json({
      status: tenant.status,
      progress: tenant.progress,
      services: sanitizePublicPortalServices(tenant.slug, tenant.services as Json),
    });
  });
}
