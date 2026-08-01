import { jsonError, jsonOk, serverErrorLogged } from '../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { runModuleProvisioning } from '../../../../../../../lib/tenant-modules/provisioning';
import {
  getMissingDependencies,
  upsertTenantModuleStatus,
} from '../../../../../../../lib/services/tenant-modules.service';
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
    const missing = await getMissingDependencies(slugParsed.data, moduleParsed.data);
    if (missing.length > 0) {
      return Response.json(
        { error: 'Missing module dependencies', missing_dependencies: missing },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    await upsertTenantModuleStatus(slugParsed.data, moduleParsed.data, 'queued');

    // Fire-and-forget — same pattern as provisionTenant() in lib/orchestrator.ts.
    // Errors are handled and persisted inside runModuleProvisioning itself.
    void runModuleProvisioning(slugParsed.data, moduleParsed.data);

    return jsonOk({ status: 'queued' }, HTTP_STATUS.ACCEPTED);
  } catch (err) {
    return serverErrorLogged('POST activate tenant module:', err);
  }
}
