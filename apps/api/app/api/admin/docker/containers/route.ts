import { requireAdminAccess } from '../../../../../lib/auth';
import { DOCKER_PS_LIST_MAX } from '../../../../../lib/constants';
import { listDockerContainers } from '../../../../../lib/docker-ps-list';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const result = await listDockerContainers();

  if (!result.ok) {
    return Response.json({
      generated_at: new Date().toISOString(),
      docker_available: false,
      error: result.error,
      truncated: false,
      limit: DOCKER_PS_LIST_MAX,
      containers: [],
    });
  }

  return Response.json({
    generated_at: new Date().toISOString(),
    docker_available: true,
    error: null,
    truncated: result.truncated,
    limit: DOCKER_PS_LIST_MAX,
    containers: result.containers,
  });
}
