import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../../../lib/constants';
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../../../lib/portal-trusted-identity';
import { handlePatchShieldSecret } from '../../../../../../../../lib/shield-portal-handlers';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string; findingId: string }> }
): Promise<Response> {
  const { slug, findingId } = await context.params;
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }
  if (!tenantSlugMatchesSession(trusted.session, slug)) {
    return Response.json(
      { error: 'Tenant slug does not match session' },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }
  return handlePatchShieldSecret(request, slug, findingId);
}
