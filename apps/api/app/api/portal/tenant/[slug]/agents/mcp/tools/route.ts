import { agentIdeMcpCatalog } from '@/lib/agent-ide-console';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, async () => agentIdeMcpCatalog('portal'));
}
