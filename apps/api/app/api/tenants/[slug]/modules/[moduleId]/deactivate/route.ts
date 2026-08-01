import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import {
  resolveActiveTenantSlug,
  upsertTenantModuleStatus,
} from '../../../../../../../lib/services/tenant-modules.service';
import { getModuleDefinition } from '../../../../../../../lib/tenant-modules/catalog';
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

  const mod = getModuleDefinition(moduleParsed.data);
  if (!mod) {
    return jsonError('Unknown module id', HTTP_STATUS.NOT_FOUND);
  }

  try {
    const tenantSlug = await resolveActiveTenantSlug(slugParsed.data);
    if (!tenantSlug) {
      return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
    }

    await upsertTenantModuleStatus(tenantSlug, moduleParsed.data, 'disabled');
    return jsonOk({ status: 'disabled', manual_steps: mod.manual_steps });
  } catch (err) {
    return serverErrorLogged('POST deactivate tenant module:', err);
  }
}
