import { agentIdeMcpCatalog } from '@/lib/agent-ide-console';
import { requireAdminAccess } from '@/lib/auth';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  return agentIdeMcpCatalog('admin');
}
