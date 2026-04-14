import { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../lib/constants';
import { respondTrustedPortalMe } from '../../../../../../lib/portal-me-json';
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../lib/portal-trusted-identity';

/**
 * Mismo JSON que `GET /api/portal/me`, pero el segmento `[slug]` debe coincidir
 * con el tenant de la sesión.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  const { slug } = await context.params;
  if (!tenantSlugMatchesSession(trusted.session, slug)) {
    return Response.json(
      { error: 'Tenant slug does not match session' },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }

  return respondTrustedPortalMe(trusted.session);
}
