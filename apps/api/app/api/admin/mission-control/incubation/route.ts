import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { getIncubationMachineSnapshot } from '../../../../../lib/incubation-machine';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  try {
    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('slug');
    const snapshot = await getIncubationMachineSnapshot({ tenantSlug });

    if (tenantSlug && snapshot.selected_tenant_slug !== tenantSlug) {
      return Response.json(
        { error: `tenant_not_found: ${tenantSlug}` },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return Response.json(snapshot, { status: HTTP_STATUS.OK });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `failed_to_read_incubation_machine: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
