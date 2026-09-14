import { requireAdminAccess } from '../../../../../lib/auth';
import { readDockerContainerResources } from '../../../../../lib/docker-container-resources';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const result = await readDockerContainerResources();
  return Response.json(
    {
      generated_at: new Date().toISOString(),
      docker_available: result.ok,
      error: result.error,
      containers: result.containers,
    },
    { status: 200 },
  );
}
