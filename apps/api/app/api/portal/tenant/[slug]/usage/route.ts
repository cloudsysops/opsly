import { NextRequest } from 'next/server';
import { runTrustedPortalDalForPathSlug } from '../../../../../../lib/portal-tenant-dal';
import { respondPortalTenantUsage } from '../../../../../../lib/portal-usage-json';

/**
 * Mismo agregado que `GET /api/portal/usage`, pero el segmento `[slug]` debe
 * coincidir con el tenant de la sesión (`tenantSlugMatchesSession`).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, () =>
    respondPortalTenantUsage(request, slug)
  );
}
