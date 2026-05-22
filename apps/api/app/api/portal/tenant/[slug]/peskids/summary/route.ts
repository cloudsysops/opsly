import { NextRequest } from 'next/server';
import { runTrustedPortalDalForPathSlug } from '../../../../../../../lib/portal-tenant-dal';
import { PESKIDS_TENANT_SLUG } from '../../../../../../../lib/peskids/constants';
import { respondPeskidsPortalSummary } from '../../../../../../../lib/peskids/portal-summary';
import { HTTP_STATUS } from '../../../../../../../lib/constants';

/**
 * GET /api/portal/tenant/{slug}/peskids/summary
 * Owner dashboard MVP (leads + feedback). Slug path must match session tenant.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  if (slug !== PESKIDS_TENANT_SLUG) {
    return Response.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }
  return runTrustedPortalDalForPathSlug(request, slug, () => respondPeskidsPortalSummary());
}
