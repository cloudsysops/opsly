import { NextRequest } from 'next/server';
import { applyPortalModeUpdate } from '../../../../../../lib/portal-mode-update';
import { runTrustedPortalDalForPathSlug } from '../../../../../../lib/portal-tenant-dal';

/**
 * Mismo comportamiento que `POST /api/portal/mode`, pero el segmento `[slug]`
 * debe coincidir con el tenant de la sesión (`tenantSlugMatchesSession`).
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, (session) =>
    applyPortalModeUpdate(session, request)
  );
}
