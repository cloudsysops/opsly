import { applyPortalModeUpdate } from '../../../../lib/portal-mode-update';
import { runTrustedPortalDal } from '../../../../lib/portal-tenant-dal';

export async function POST(request: Request): Promise<Response> {
  return runTrustedPortalDal(request, (session) => applyPortalModeUpdate(session, request));
}
