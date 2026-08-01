import { jsonError, jsonOk, serverErrorLogged } from '../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import {
  listTenantModules,
  resolveActiveTenantSlug,
} from '../../../../../lib/services/tenant-modules.service';
import { TenantRefParamSchema, formatZodError } from '../../../../../lib/validation';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  // Always authenticated: this payload exposes operational status and
  // `last_error` (script stderr), which is not appropriate for the public
  // demo-read allowance used by other tenant-overview endpoints.
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const { slug } = await context.params;
  const parsed = TenantRefParamSchema.safeParse(slug);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const tenantSlug = await resolveActiveTenantSlug(parsed.data);
    if (!tenantSlug) {
      return jsonError('Tenant not found', HTTP_STATUS.NOT_FOUND);
    }
    const modules = await listTenantModules(tenantSlug);
    return jsonOk({ modules });
  } catch (err) {
    return serverErrorLogged('GET tenant modules:', err);
  }
}
