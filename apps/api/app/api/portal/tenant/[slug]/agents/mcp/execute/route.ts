import { executeAgentIdeMcpTool } from '@/lib/agent-ide-console';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, async () => {
    const body = await request.json().catch(() => null);
    return executeAgentIdeMcpTool('portal', body, slug);
  });
}
