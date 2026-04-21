import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../lib/api-response';
import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { CreateSubscriptionSchema } from '../../../../lib/billing/subscription-types';
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionForTenant,
  listBillingPlans,
} from '../../../../lib/billing/subscription-service';
import { resolveTrustedPortalSession } from '../../../../lib/portal-trusted-identity';
import { formatZodError } from '../../../../lib/validation';

/**
 * GET /api/billing/subscriptions
 *
 * Returns the subscription for the authenticated tenant,
 * or for a specific tenant (admin with ?tenant_id=).
 * Also returns available plans.
 */
export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/billing/subscriptions', async () => {
    const url = new URL(request.url);
    const adminTenantId = url.searchParams.get('tenant_id');

    if (adminTenantId) {
      const authError = await requireAdminAccess(request);
      if (authError) return authError;

      const [subscription, plans] = await Promise.all([
        getSubscriptionForTenant(adminTenantId),
        listBillingPlans(),
      ]);

      return Response.json({ subscription, plans });
    }

    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    const [subscription, plans] = await Promise.all([
      getSubscriptionForTenant(session.session.tenant.id),
      listBillingPlans(),
    ]);

    return Response.json({ subscription, plans });
  });
}

/**
 * POST /api/billing/subscriptions
 *
 * Create a subscription for a tenant.
 */
export function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/billing/subscriptions', async () => {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.body as Record<string, unknown>;
    const parsed = CreateSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    if (body.tenant_id) {
      return createSubscriptionAsAdmin(request, String(body.tenant_id), parsed.data);
    }

    return createSubscriptionAsPortal(request, parsed.data);
  });
}

async function createSubscriptionAsAdmin(
  request: Request,
  tenantId: string,
  payload: ReturnType<typeof CreateSubscriptionSchema.parse>
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  return runCreateSubscription(tenantId, payload);
}

async function createSubscriptionAsPortal(
  request: Request,
  payload: ReturnType<typeof CreateSubscriptionSchema.parse>
): Promise<Response> {
  const session = await resolveTrustedPortalSession(request);
  if (!session.ok) return session.response;
  return runCreateSubscription(session.session.tenant.id, payload);
}

async function runCreateSubscription(
  tenantId: string,
  payload: ReturnType<typeof CreateSubscriptionSchema.parse>
): Promise<Response> {
  try {
    const sub = await createSubscription(tenantId, payload);
    return Response.json(sub, { status: HTTP_STATUS.CREATED });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed';
    if (msg.includes('already has a subscription')) {
      return jsonError(msg, HTTP_STATUS.CONFLICT);
    }
    return serverErrorLogged('POST /api/billing/subscriptions', err);
  }
}

/**
 * DELETE /api/billing/subscriptions
 *
 * Cancel the tenant's subscription.
 */
export function DELETE(request: Request): Promise<Response> {
  return tryRoute('DELETE /api/billing/subscriptions', async () => {
    const url = new URL(request.url);
    const adminTenantId = url.searchParams.get('tenant_id');

    if (adminTenantId) {
      const authError = await requireAdminAccess(request);
      if (authError) return authError;

      const cancelled = await cancelSubscription(adminTenantId);
      if (!cancelled) return jsonError('No active subscription', HTTP_STATUS.NOT_FOUND);
      return Response.json(cancelled);
    }

    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    const cancelled = await cancelSubscription(session.session.tenant.id);
    if (!cancelled) return jsonError('No active subscription', HTTP_STATUS.NOT_FOUND);
    return Response.json(cancelled);
  });
}
