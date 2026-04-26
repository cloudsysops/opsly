import { parsePortalMode, parsePortalServices, portalUrlReachable } from './portal-me';
import type { TrustedPortalSession } from './portal-trusted-identity';

/**
 * JSON de sesión portal (compartido por `GET /api/portal/me` y
 * `GET /api/portal/tenant/[slug]/me`).
 */
export async function respondTrustedPortalMe(session: TrustedPortalSession): Promise<Response> {
  const { user, tenant: lookup } = session;
  const svc = parsePortalServices(lookup.services);
  const [n8n_reachable, uptime_reachable] = await Promise.all([
    portalUrlReachable(svc.n8n_url),
    portalUrlReachable(svc.uptime_url),
  ]);
  const mode = parsePortalMode(user.user_metadata);

  return Response.json({
    tenant_id: lookup.id,
    slug: lookup.slug,
    name: lookup.name,
    plan: lookup.plan,
    status: lookup.status,
    mode,
    created_at: lookup.created_at,
    services: svc,
    health: { n8n_reachable, uptime_reachable },
  });
}
