import { requireAdminAccessUnlessDemoRead } from '../../../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { callId: string } }
): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  return proxyRuntimeOrchestrator(
    `/internal/voice/transcriptions/${params.callId}`,
    {
      method: 'GET',
    }
  );
}
