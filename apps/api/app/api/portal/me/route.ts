import { respondTrustedPortalMe } from '../../../../lib/portal-me-json';
import { runTrustedPortalDal } from '../../../../lib/portal-tenant-dal';

export async function GET(request: Request): Promise<Response> {
  return runTrustedPortalDal(request, (session) => respondTrustedPortalMe(session));
}
