import { stopAgentIdeTerminalSession } from '@/lib/agent-ide-console';
import { requireAdminAccess } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ agentId: string; sessionId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  const { agentId, sessionId } = await context.params;
  return stopAgentIdeTerminalSession(agentId, sessionId);
}
