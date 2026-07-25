import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { listFamilyAgenda } from '@/lib/services/agenda.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const from = req.nextUrl.searchParams.get('from') ?? new Date().toISOString();
  const to =
    req.nextUrl.searchParams.get('to') ??
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const agenda = await listFamilyAgenda({
      familyUserId: auth.user.id,
      from,
      to,
    });

    return successJson(requestId, { ok: true, agenda });
  } catch (err) {
    console.error('[GET /api/portal/agenda]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to load agenda', 500);
  }
}
