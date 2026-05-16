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
  return proxyRuntimeOrchestrator(
    `/internal/runtime/sessions/${encodeURIComponent(sessionId)}/stop`,
    { method: 'POST' }
  );
}
