import { CACHE_TTL, HTTP_STATUS } from './constants';
import {
  fetchPortalTenantRowBySlug,
  portalUrlReachable,
  resolvePortalServicesForTenant,
} from './portal-me';
import { getCache, setCache } from './redis-cache';

export type PortalTenantHealthPayload = {
  slug: string;
  name: string;
  plan: string;
  status: string;
  services: ReturnType<typeof resolvePortalServicesForTenant>;
  health: {
    n8n_reachable: boolean;
    uptime_reachable: boolean;
    checked_at: string;
  };
};

/**
 * Respuesta JSON de health para un tenant (compartida por
 * `GET /api/portal/health` y `GET /api/portal/tenant/[slug]/health`).
 */
export async function respondPortalTenantHealth(tenantSlug: string): Promise<Response> {
  const cacheKey = `portal:tenant_health:${tenantSlug}`;
  // Bolt Optimization: Check Redis cache first to bypass DB lookup and external probes
  const cached = await getCache<PortalTenantHealthPayload>(cacheKey);
  if (cached !== null) {
    return Response.json(cached);
  }

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

  const svc = resolvePortalServicesForTenant(lookup.row.slug, lookup.row.services);
  const [n8n_reachable, uptime_reachable] = await Promise.all([
    portalUrlReachable(svc.n8n_url),
    portalUrlReachable(svc.uptime_url),
  ]);

  const payload: PortalTenantHealthPayload = {
    slug: lookup.row.slug,
    name: lookup.row.name,
    plan: lookup.row.plan,
    status: lookup.row.status,
    services: svc,
    health: {
      n8n_reachable,
      uptime_reachable,
      checked_at: new Date().toISOString(),
    },
  };

  // Bolt Optimization: Cache response in Redis for 60s without blocking current response
  void setCache(cacheKey, payload, CACHE_TTL.SHORT).catch(() => {
    /* ignore cache write error */
  });

  return Response.json(payload);
}
