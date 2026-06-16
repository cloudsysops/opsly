import { proxyRuntimeOrchestrator } from '../../../../lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return proxyRuntimeOrchestrator('/internal/runtime/capabilities');
}
