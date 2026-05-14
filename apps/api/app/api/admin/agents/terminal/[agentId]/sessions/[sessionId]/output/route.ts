import { readAgentIdeTerminalOutput } from '@/lib/agent-ide-console';
import { requireAdminAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  context: { params: Promise<{ agentId: string; sessionId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  const { agentId, sessionId } = await context.params;
  const url = new URL(request.url);
  return readAgentIdeTerminalOutput(agentId, sessionId, url.searchParams.get('offset'));
}
