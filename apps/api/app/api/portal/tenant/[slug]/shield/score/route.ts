import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../../lib/portal-trusted-identity';
import { handleGetShieldScore } from '../../../../../../../lib/shield-portal-handlers';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
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
  return handleGetShieldScore(request, slug);
}
