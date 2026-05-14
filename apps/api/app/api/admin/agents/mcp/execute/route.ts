import { executeAgentIdeMcpTool } from '@/lib/agent-ide-console';
import { requireAdminAccess } from '@/lib/auth';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  const body = await request.json().catch(() => null);
  return executeAgentIdeMcpTool('admin', body);
}
