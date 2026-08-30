import { CACHE_TTL, HTTP_STATUS } from './constants';
import {
  fetchPortalTenantRowBySlug,
  portalUrlReachable,
  resolvePortalServicesForTenant,
} from './portal-me';
import { getCache, setCache } from './redis-cache';

export type PortalTenantHealthShape = {
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
 * Cacheado en Redis por 60s (CACHE_TTL.SHORT) para evitar DB lookups
 * y reachability probes en llamadas repetidas (monitoring, polling).
 */
export async function respondPortalTenantHealth(tenantSlug: string): Promise<Response> {
  const cacheKey = `portal:tenant_health:${tenantSlug}`;
  const cached = await getCache<PortalTenantHealthShape>(cacheKey);
  if (cached) {
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

  const result: PortalTenantHealthShape = {
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
  };

  void setCache(cacheKey, result, CACHE_TTL.SHORT);

  return Response.json(result);
}
