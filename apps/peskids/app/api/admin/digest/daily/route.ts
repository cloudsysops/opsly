import { type NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { buildDailyDigest } from '@/lib/services/daily-digest.service';

function isCronAuthorized(req: NextRequest): boolean {
  const secret =
    process.env.PESKIDS_DIGEST_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) return false;

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const headerToken = req.headers.get('x-cron-secret')?.trim() ?? '';

  return bearer === secret || headerToken === secret;
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const cronOk = isCronAuthorized(req);
  if (!cronOk) {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }
  }

  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids').trim().toLowerCase();
  if (tenantId !== 'peskids') {
    return errorJson(requestId, 'Forbidden', 403);
  }

  try {
    const digest = await buildDailyDigest();
    return successJson(requestId, digest);
  } catch (error) {
    console.error('[admin/digest/daily]', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to build daily digest', 500);
  }
}
