import { readAgentIdeTerminalOutput } from '@/lib/agent-ide-console';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; agentId: string; sessionId: string }> }
): Promise<Response> {
  const { slug, agentId, sessionId } = await context.params;
  const url = new URL(request.url);
  return runTrustedPortalDalForPathSlug(request, slug, () =>
    readAgentIdeTerminalOutput(agentId, sessionId, url.searchParams.get('offset'))
  );
}
