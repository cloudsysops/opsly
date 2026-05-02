import { respondPortalTenantHealth } from '../../../../../../lib/portal-health-json';
import { runTrustedPortalDalForPathSlug } from '../../../../../../lib/portal-tenant-dal';

/**
 * Health check del tenant de la sesión — el segmento `[slug]` debe coincidir
 * con el tenant del JWT (`tenantSlugMatchesSession`).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, () => respondPortalTenantHealth(slug));
}
