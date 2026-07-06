import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { getIntegrationsStatus } from '@/lib/services/integrations-status.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const integrations = getIntegrationsStatus();
    return successJson(requestId, { ok: true, integrations });
  } catch (err) {
    console.error('[GET /api/admin/integrations-status]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to load integrations status', 500);
  }
}
