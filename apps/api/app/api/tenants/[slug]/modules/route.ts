import { jsonError, jsonOk, serverErrorLogged } from '../../../../../lib/api-response';
import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { listTenantModules } from '../../../../../lib/services/tenant-modules.service';
import { TenantRefParamSchema, formatZodError } from '../../../../../lib/validation';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const { slug } = await context.params;
  const parsed = TenantRefParamSchema.safeParse(slug);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const modules = await listTenantModules(parsed.data);
    return jsonOk({ modules });
  } catch (err) {
    return serverErrorLogged('GET tenant modules:', err);
  }
}
