import { HTTP_STATUS } from "../../../../lib/constants";
import { getUserFromAuthorizationHeader } from "../../../../lib/portal-auth";
import {
  fetchPortalTenantRowBySlug,
  parsePortalMode,
  parsePortalServices,
  portalUrlReachable,
  readPortalTenantSlugFromUser,
} from "../../../../lib/portal-me";

export async function GET(request: Request): Promise<Response> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  const slug = readPortalTenantSlugFromUser(user);
  if (!slug) {
    return Response.json(
      { error: "No tenant associated with this account" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  const lookup = await fetchPortalTenantRowBySlug(slug);
  if (!lookup.ok) {
    const status =
      lookup.reason === "db" ? HTTP_STATUS.INTERNAL_ERROR : HTTP_STATUS.NOT_FOUND;
    const message = lookup.reason === "db" ? "Internal server error" : "Tenant not found";
    return Response.json({ error: message }, { status });
  }

  const emailNorm = user.email?.toLowerCase() ?? "";
  if (lookup.row.owner_email.toLowerCase() !== emailNorm) {
    return Response.json({ error: "Forbidden" }, { status: HTTP_STATUS.FORBIDDEN });
  }

  const svc = parsePortalServices(lookup.row.services);
  const [n8n_reachable, uptime_reachable] = await Promise.all([
    portalUrlReachable(svc.n8n_url),
    portalUrlReachable(svc.uptime_url),
  ]);

  const mode = parsePortalMode(user.user_metadata);

  return Response.json({
    tenant_id: lookup.row.id,
    slug: lookup.row.slug,
    name: lookup.row.name,
    plan: lookup.row.plan,
    status: lookup.row.status,
    mode,
    created_at: lookup.row.created_at,
    services: svc,
    health: { n8n_reachable, uptime_reachable },
  });
}
