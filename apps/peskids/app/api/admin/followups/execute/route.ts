import { type NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { executeDueFollowups } from '@/lib/services/followup-admin.service';

export const dynamic = 'force-dynamic';

function isCronAuthorized(req: NextRequest): boolean {
  const secret =
    process.env.PESKIDS_FOLLOWUP_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim() || '';
  if (!secret) return false;

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = req.headers.get('x-cron-secret')?.trim() ?? '';

  return bearer === secret || headerToken === secret;
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const cronOk = isCronAuthorized(req);
  if (!cronOk) {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }
  }

  try {
    const result = await executeDueFollowups();
    return successJson(requestId, { ok: true, ...result });
  } catch (error) {
    console.error('[admin/followups/execute]', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to execute followups', 500);
  }
}
