import { requireAdminAccessUnlessDemoRead } from '@/lib/auth';
import { proxyRuntimeOrchestrator } from '@/lib/runtime-proxy';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccessUnlessDemoRead(request);
  if (authError) {
    return authError;
  }
  const url = new URL(request.url);
  const plan = url.searchParams.get('tenant_plan');
  const qs = plan ? `?tenant_plan=${encodeURIComponent(plan)}` : '';
  return proxyRuntimeOrchestrator(`/internal/runtime/governor/status${qs}`);
}
