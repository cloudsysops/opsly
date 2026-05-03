import { NextRequest } from 'next/server';
import { respondTrustedPortalMe } from '../../../../../../lib/portal-me-json';
import {
  PORTAL_READ_ACCESS,
  runTrustedPortalDalForPathSlug,
} from '../../../../../../lib/portal-tenant-dal';

/**
 * Mismo JSON que `GET /api/portal/me`, pero el segmento `[slug]` debe coincidir
 * con el tenant de la sesión.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(
    request,
    slug,
    (session) => respondTrustedPortalMe(session),
    PORTAL_READ_ACCESS
  );
}
