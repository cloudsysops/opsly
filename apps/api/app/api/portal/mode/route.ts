import { applyPortalModeUpdate } from '../../../../lib/portal-mode-update';
import { resolveTrustedPortalSession } from '../../../../lib/portal-trusted-identity';

export async function POST(request: Request): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  return applyPortalModeUpdate(trusted.session, request);
}
