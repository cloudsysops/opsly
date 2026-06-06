import { NextRequest } from 'next/server';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { attendanceUpdateSchema } from '@/lib/validation/class.schema';
import { getClassById } from '@/lib/services/class.service';
import { updateAttendance } from '@/lib/services/enrollment.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id: classId } = await context.params;

  const classItem = await getClassById(classId);
  if (!classItem) {
    return errorJson(requestId, 'Not found', 404);
  }

  const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
  if (
    auth.method === 'supabase' &&
    role === 'teacher' &&
    auth.user &&
    classItem.professor_user_id !== auth.user.id
  ) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = attendanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const updated = await updateAttendance(classId, parsed.data.updates);
    return successJson(requestId, { ok: true, updated });
  } catch (err) {
    console.error('[PATCH attendance]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update attendance', 500);
  }
}
