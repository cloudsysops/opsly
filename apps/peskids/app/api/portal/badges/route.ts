import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { listFamilyStudents } from '@/lib/services/student.service';
import { listBadgesForStudents } from '@/lib/services/badge.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const students = await listFamilyStudents(auth.user);
    const badges = await listBadgesForStudents(students.map((s) => s.id));
    return successJson(requestId, { ok: true, badges });
  } catch (err) {
    console.error('[GET /api/portal/badges]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list badges', 500);
  }
}
