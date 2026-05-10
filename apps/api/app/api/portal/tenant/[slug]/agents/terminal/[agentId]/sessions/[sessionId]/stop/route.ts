import { stopAgentIdeTerminalSession } from '@/lib/agent-ide-console';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; agentId: string; sessionId: string }> }
): Promise<Response> {
  const { slug, agentId, sessionId } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, () =>
    stopAgentIdeTerminalSession(agentId, sessionId)
  );
}
