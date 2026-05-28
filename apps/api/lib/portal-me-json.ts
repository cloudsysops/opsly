import {
  parsePortalMode,
  portalUrlReachable,
  resolvePortalServicesForTenant,
} from './portal-me';
import type { TrustedPortalSession } from './portal-trusted-identity';

/**
 * JSON de sesión portal (compartido por `GET /api/portal/me` y
 * `GET /api/portal/tenant/[slug]/me`).
 */
export async function respondTrustedPortalMe(session: TrustedPortalSession): Promise<Response> {
  const { user, tenant: lookup } = session;
  const svc = resolvePortalServicesForTenant(lookup.slug, lookup.services);
  const [n8n_reachable, uptime_reachable] = await Promise.all([
    portalUrlReachable(svc.n8n_url),
    portalUrlReachable(svc.uptime_url),
  ]);
  const mode = parsePortalMode(user.user_metadata);

  // Explicitly allow-list fields from services sent to the portal.
  // We NEVER return credentials (n8n_user, n8n_password) to the browser.
  const sanitizedSvc = {
    n8n_url: svc.n8n_url,
    uptime_url: svc.uptime_url,
  };

  return Response.json({
    tenant_id: lookup.id,
    slug: lookup.slug,
    name: lookup.name,
    plan: lookup.plan,
    status: lookup.status,
    mode,
    role: session.membership.role,
    created_at: lookup.created_at,
    services: sanitizedSvc,
    health: { n8n_reachable, uptime_reachable },
  });
}
