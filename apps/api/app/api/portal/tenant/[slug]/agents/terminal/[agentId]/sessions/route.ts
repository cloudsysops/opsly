import { listAgentIdeTerminalSessions } from '@/lib/agent-ide-console';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; agentId: string }> }
): Promise<Response> {
  const { slug, agentId } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, () =>
    listAgentIdeTerminalSessions(agentId)
  );
}
