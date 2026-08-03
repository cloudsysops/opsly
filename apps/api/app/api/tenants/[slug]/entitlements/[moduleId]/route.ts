import { z } from 'zod';
import { revokeEntitlement, TenantNotFoundError } from '@intcloudsysops/services/entitlements';
import { jsonError, tryRoute } from '../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../lib/constants';
import { getServiceClient } from '../../../../../../lib/supabase';
import { TenantSlugParamSchema, formatZodError } from '../../../../../../lib/validation';

const ModuleIdParamSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'moduleId must be lowercase kebab-case');

export function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  return tryRoute('DELETE /api/tenants/[slug]/entitlements/[moduleId]', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const { slug: rawSlug, moduleId: rawModuleId } = await context.params;
    const slugParsed = TenantSlugParamSchema.safeParse(rawSlug);
    if (!slugParsed.success) {
      return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
    }
    const moduleIdParsed = ModuleIdParamSchema.safeParse(rawModuleId);
    if (!moduleIdParsed.success) {
      return jsonError(formatZodError(moduleIdParsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      await revokeEntitlement(getServiceClient(), slugParsed.data, moduleIdParsed.data);
      return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
    } catch (err) {
      if (err instanceof TenantNotFoundError) {
        return jsonError(err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}
