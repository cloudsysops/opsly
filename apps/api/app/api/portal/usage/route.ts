import { NextRequest } from 'next/server';
import { runTrustedPortalDal } from '../../../../lib/portal-tenant-dal';
import { respondPortalTenantUsage } from '../../../../lib/portal-usage-json';

/**
 * Uso LLM del tenant de la sesión (mismo agregado que admin `GET /api/metrics/tenant/:slug`,
 * pero sin slug en URL: solo el tenant vinculado al JWT).
 */
export async function GET(request: NextRequest): Promise<Response> {
  return runTrustedPortalDal(request, (session) =>
    respondPortalTenantUsage(request, session.tenant.slug)
  );
}
