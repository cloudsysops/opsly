import { NextRequest } from 'next/server';
import { respondPortalTenantUsage } from '../../../../lib/portal-usage-json';
import { resolveTrustedPortalSession } from '../../../../lib/portal-trusted-identity';

/**
 * Uso LLM del tenant de la sesión (mismo agregado que admin `GET /api/metrics/tenant/:slug`,
 * pero sin slug en URL: solo el tenant vinculado al JWT).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  const slug = trusted.session.tenant.slug;
  return respondPortalTenantUsage(request, slug);
}
