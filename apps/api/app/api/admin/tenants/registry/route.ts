import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { getPlatformTenantRegistry } from '../../../../../lib/platform-foundation';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  try {
    const snapshot = await getPlatformTenantRegistry();
    return Response.json(
      {
        generated_at: new Date().toISOString(),
        stages: snapshot.stages,
        total: snapshot.items.length,
        by_stage: snapshot.by_stage,
        extraction_ready: snapshot.extraction_ready,
        tenants: snapshot.items,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `failed_to_read_tenant_registry: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
