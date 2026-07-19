import { jsonError, tryRoute } from '@/lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { getConfigForTenant, getSession, isOpenWAEnabledForTenant } from '@intcloudsysops/openwa';

type RouteParams = { params: Promise<{ slug: string }> };

/** GET /api/admin/channels/openwa/:slug — Opsly admin: OpenWA session status per tenant */
export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  return tryRoute(`GET /api/admin/channels/openwa/${(await params).slug}/status`, async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const { slug } = await params;
    if (!/^[a-z0-9-]{3,30}$/.test(slug)) {
      return jsonError('Invalid tenant slug', HTTP_STATUS.BAD_REQUEST);
    }

    if (!isOpenWAEnabledForTenant(slug)) {
      return jsonError(`OpenWA not configured for tenant ${slug}`, HTTP_STATUS.NOT_FOUND);
    }

    const cfg = getConfigForTenant(slug);
    if (!cfg) {
      return jsonError('OpenWA config missing', HTTP_STATUS.NOT_FOUND);
    }

    const session = await getSession(cfg);
    return Response.json({
      ok: true,
      tenant_slug: slug,
      session,
      api_url: cfg.apiUrl,
    });
  });
}
