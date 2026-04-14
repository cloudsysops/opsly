import { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../lib/constants';
import { applyPortalModeUpdate } from '../../../../../../lib/portal-mode-update';
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../lib/portal-trusted-identity';

/**
 * Mismo comportamiento que `POST /api/portal/mode`, pero el segmento `[slug]`
 * debe coincidir con el tenant de la sesión (`tenantSlugMatchesSession`).
 */
export async function POST(
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

  return applyPortalModeUpdate(trusted.session, request);
}
