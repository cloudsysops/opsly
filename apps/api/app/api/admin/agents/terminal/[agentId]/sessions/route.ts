import { listAgentIdeTerminalSessions } from '@/lib/agent-ide-console';
import { requireAdminAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ agentId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  const { agentId } = await context.params;
  return listAgentIdeTerminalSessions(agentId);
}
