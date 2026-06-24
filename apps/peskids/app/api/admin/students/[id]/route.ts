import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { updateStudentSchema } from '@/lib/validation/student.schema';
import { updateStudent } from '@/lib/services/student.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = updateStudentSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const updated = await updateStudent(id, parsed.data);
    return successJson(requestId, { ok: true, student: updated });
  } catch (err) {
    if (err instanceof Error && err.message === 'Student not found') {
      return errorJson(requestId, 'Not found', 404);
    }
    console.error('[PATCH /api/admin/students/[id]]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update student', 500);
  }
}
