import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';
import { startAgentIdeTerminal, type AgentIdeTerminalStartBody } from '@/lib/agent-ide-console';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, async () => {
    const body = (await request.json().catch(() => null)) as AgentIdeTerminalStartBody | null;
    if (body === null) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    return startAgentIdeTerminal(body, slug);
  });
}
