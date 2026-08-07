import { requireAdminAccessUnlessDemoRead } from '../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ callId: string }> }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const { callId } = await context.params;

  return proxyRuntimeOrchestrator(`/internal/voice/transcriptions/${callId}`, {
    method: 'GET',
  });
}
