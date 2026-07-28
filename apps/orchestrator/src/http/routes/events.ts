import type { RouteContext } from '../router.js';
import { parseBody, verifyPlatformAdminToken } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import { publishTenantDomainEvent } from '../../events/bus.js';

/**
 * Authenticated HTTP ingest for tenant domain events (Peskids OPSLY_EVENT_BUS_URL).
 * Accepts Bearer PLATFORM_ADMIN_TOKEN or OPSLY_EVENT_BUS_TOKEN.
 * Never public — callers must be on the internal Docker/Tailscale network.
 */
function verifyEventBusToken(req: RouteContext['req']): boolean {
  if (verifyPlatformAdminToken(req)) return true;
  const expected = process.env.OPSLY_EVENT_BUS_TOKEN?.trim() ?? '';
  if (expected.length === 0) return false;
  const auth = req.headers.authorization;
  const bearer =
    typeof auth === 'string' && auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length).trim()
      : '';
  return bearer.length > 0 && bearer === expected;
}

export async function handleTenantEvents(ctx: RouteContext): Promise<void> {
  if (!verifyEventBusToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const b = body as Record<string, unknown>;
  const eventType =
    typeof b.event_type === 'string'
      ? b.event_type.trim()
      : typeof b.event === 'string'
        ? b.event.trim()
        : '';
  const tenantId =
    typeof b.tenant_id === 'string'
      ? b.tenant_id.trim()
      : typeof b.tenant_slug === 'string'
        ? b.tenant_slug.trim()
        : '';

  if (eventType.length === 0 || tenantId.length === 0) {
    errorResponse(ctx.res, 400, 'event_type and tenant_id required');
    return;
  }

  const data =
    typeof b.data === 'object' && b.data !== null
      ? (b.data as Record<string, unknown>)
      : {};
  const traceId =
    typeof b.trace_id === 'string'
      ? b.trace_id
      : typeof b.request_id === 'string'
        ? b.request_id
        : undefined;

  try {
    await publishTenantDomainEvent({
      event_type: eventType,
      tenant_id: tenantId,
      created_at:
        typeof b.created_at === 'string' ? b.created_at : new Date().toISOString(),
      data,
      trace_id: traceId,
    });
  } catch (err) {
    errorResponse(
      ctx.res,
      503,
      err instanceof Error ? err.message : 'event_publish_failed'
    );
    return;
  }

  jsonResponse(ctx.res, 202, {
    ok: true,
    accepted: true,
    event_type: eventType,
    tenant_id: tenantId,
  });
}
