import { HTTP_STATUS } from './constants';
import { fetchPortalTenantRowBySlug, parsePortalServices, portalUrlReachable } from './portal-me';

/**
 * Respuesta JSON de health para un tenant (compartida por
 * `GET /api/portal/health` y `GET /api/portal/tenant/[slug]/health`).
 */
export async function respondPortalTenantHealth(tenantSlug: string): Promise<Response> {
  const lookup = await fetchPortalTenantRowBySlug(tenantSlug);

  if (!lookup.ok) {
    return Response.json(
      {
        error: lookup.reason === 'not_found' ? 'Tenant not found' : 'Database error',
      },
      {
        status: lookup.reason === 'not_found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.INTERNAL_ERROR,
      }
    );
  }

  const svc = parsePortalServices(lookup.row.services);
  const [n8n_reachable, uptime_reachable] = await Promise.all([
    portalUrlReachable(svc.n8n_url),
    portalUrlReachable(svc.uptime_url),
  ]);

  return Response.json({
    slug: lookup.row.slug,
    name: lookup.row.name,
    plan: lookup.row.plan,
    status: lookup.row.status,
    services: svc,
    health: {
      n8n_reachable: n8n_reachable,
      uptime_reachable: uptime_reachable,
      checked_at: new Date().toISOString(),
    },
  });
}
