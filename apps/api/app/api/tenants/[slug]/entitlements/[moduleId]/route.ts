import { revokeEntitlement, TenantNotFoundError } from '@intcloudsysops/services/entitlements';
import { jsonError, tryRoute } from '../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../lib/constants';
import { getServiceClient } from '../../../../../../lib/supabase';

export function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  return tryRoute('DELETE /api/tenants/[slug]/entitlements/[moduleId]', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const { slug, moduleId } = await context.params;

    try {
      await revokeEntitlement(getServiceClient(), slug, moduleId);
      return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
    } catch (err) {
      if (err instanceof TenantNotFoundError) {
        return jsonError(err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}
