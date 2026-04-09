import { HTTP_STATUS } from "../../../../../../lib/constants";
import { respondPortalTenantHealth } from "../../../../../../lib/portal-health-json";
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from "../../../../../../lib/portal-trusted-identity";

/**
 * Health check del tenant de la sesión — el segmento `[slug]` debe coincidir
 * con el tenant del JWT (`tenantSlugMatchesSession`).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  const { slug } = await context.params;
  if (!tenantSlugMatchesSession(trusted.session, slug)) {
    return Response.json(
      { error: "Tenant slug does not match session" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  return respondPortalTenantHealth(slug);
}
