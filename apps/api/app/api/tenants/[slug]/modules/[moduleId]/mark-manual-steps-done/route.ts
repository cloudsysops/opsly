import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { upsertTenantModuleStatus } from '../../../../../../../lib/services/tenant-modules.service';
import {
  ModuleIdParamSchema,
  TenantRefParamSchema,
  formatZodError,
} from '../../../../../../../lib/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; moduleId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { slug, moduleId } = await context.params;
  const slugParsed = TenantRefParamSchema.safeParse(slug);
  if (!slugParsed.success) {
    return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
  }
  const moduleParsed = ModuleIdParamSchema.safeParse(moduleId);
  if (!moduleParsed.success) {
    return jsonError(formatZodError(moduleParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  try {
    await upsertTenantModuleStatus(slugParsed.data, moduleParsed.data, 'active');
    return jsonOk({ status: 'active' });
  } catch (err) {
    return serverErrorLogged('POST mark-manual-steps-done:', err);
  }
}
