import { startAgentIdeTerminal, type AgentIdeTerminalStartBody } from '@/lib/agent-ide-console';
import { requireAdminAccess } from '@/lib/auth';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  const body = (await request.json().catch(() => null)) as AgentIdeTerminalStartBody | null;
  if (body === null) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  return startAgentIdeTerminal(body);
}
