import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }
  const body = await request.text();
  return proxyRuntimeOrchestrator('/internal/mission-control/chat', {
    method: 'POST',
    body,
  });
}
