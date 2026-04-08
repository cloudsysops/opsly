import { resolveTrustedPortalSession } from "../../../../lib/portal-trusted-identity";
import {
  parsePortalMode,
  parsePortalServices,
  portalUrlReachable,
} from "../../../../lib/portal-me";

export async function GET(request: Request): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  const { user, tenant: lookup } = trusted.session;

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
