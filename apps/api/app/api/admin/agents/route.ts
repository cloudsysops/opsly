import { requireAdminAccess } from '../../../../lib/auth';
import { HTTP_STATUS } from '../../../../lib/constants';
import { getPlatformAgentRegistry } from '../../../../lib/platform-foundation';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) {
    return auth;
  }

  try {
    const snapshot = await getPlatformAgentRegistry();
    return Response.json(
      {
        generated_at: new Date().toISOString(),
        total: snapshot.summary.total,
        healthy: snapshot.summary.healthy,
        degraded: snapshot.summary.degraded,
        blocked: snapshot.summary.blocked,
        agents: snapshot.items,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: `failed_to_read_agent_registry: ${message}` },
      { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );
  }
}
