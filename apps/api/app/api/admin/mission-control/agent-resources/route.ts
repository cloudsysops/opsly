import { requireAdminAccess } from '@/lib/auth';
import { proxyRuntimeOrchestrator } from '@/lib/runtime-proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;
  return proxyRuntimeOrchestrator('/internal/terminal/resources');
}
