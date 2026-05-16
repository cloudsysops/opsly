import { requireAdminAccessUnlessDemoRead } from '../../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }
  const { sessionId } = await context.params;
  const body = await request.text();
  return proxyRuntimeOrchestrator(
    `/internal/runtime/sessions/${encodeURIComponent(sessionId)}/send`,
    { method: 'POST', body }
  );
}
