import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../lib/api-response';
import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { ReportMeteringEventSchema } from '../../../../lib/billing/subscription-types';
import {
  getMeteringUsage,
  reportMeteringEvent,
} from '../../../../lib/billing/subscription-service';
import { resolveTrustedPortalSession } from '../../../../lib/portal-trusted-identity';
import { formatZodError } from '../../../../lib/validation';

/**
 * GET /api/billing/metering-events
 *
 * Returns aggregated metering usage for the current period.
 */
export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/billing/metering-events', async () => {
    const url = new URL(request.url);
    const adminTenantId = url.searchParams.get('tenant_id');
    const periodMonth = url.searchParams.get('period_month') ?? undefined;

    if (adminTenantId) {
      const authError = await requireAdminAccess(request);
      if (authError) return authError;
      const usage = await getMeteringUsage(adminTenantId, periodMonth);
      return Response.json({ usage });
    }

    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    const usage = await getMeteringUsage(session.session.tenant.id, periodMonth);
    return Response.json({ usage });
  });
}

/**
 * POST /api/billing/metering-events
 *
 * Report a metering event. Admin or internal service call with tenant_id.
 */
export function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/billing/metering-events', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.body as Record<string, unknown>;
    const tenantId = body.tenant_id;
    if (!tenantId || typeof tenantId !== 'string') {
      return jsonError('tenant_id is required', HTTP_STATUS.BAD_REQUEST);
    }

    const parsed = ReportMeteringEventSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const event = await reportMeteringEvent(tenantId, parsed.data);
      return Response.json(event, { status: HTTP_STATUS.CREATED });
    } catch (err) {
      return serverErrorLogged('POST /api/billing/metering-events', err);
    }
  });
}
