import { NextRequest } from 'next/server';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { listAdminAgenda, listTeacherAgenda } from '@/lib/services/agenda.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const from =
    req.nextUrl.searchParams.get('from') ??
    new Date().toISOString();
  const to =
    req.nextUrl.searchParams.get('to') ??
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
    const agenda =
      role === 'teacher' && auth.user
        ? await listTeacherAgenda({
          teacherUserId: auth.user.id,
          from,
          to,
        })
        : await listAdminAgenda({ from, to });

    return successJson(requestId, { ok: true, agenda });
  } catch (err) {
    console.error('[GET /api/admin/agenda]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to load agenda', 500);
  }
}
