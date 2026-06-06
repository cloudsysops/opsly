import { NextRequest } from 'next/server';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { updateClassSchema } from '@/lib/validation/class.schema';
import { ClassScheduleConflictError } from '@/lib/class-types';
import { getClassById, updateClass } from '@/lib/services/class.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id } = await context.params;

  try {
    const classItem = await getClassById(id);
    if (!classItem) {
      return errorJson(requestId, 'Not found', 404);
    }

    const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
    if (role === 'teacher' && auth.user && classItem.professor_user_id !== auth.user.id) {
      return errorJson(requestId, 'Forbidden', 403);
    }

    return successJson(requestId, { ok: true, class: classItem });
  } catch (err) {
    console.error('[GET /api/admin/classes/[id]]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to fetch class', 500);
  }
}

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

  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const updated = await updateClass(id, parsed.data);
    return successJson(requestId, { ok: true, class: updated });
  } catch (err) {
    if (err instanceof ClassScheduleConflictError) {
      return errorJson(requestId, err.message, 409);
    }
    if (err instanceof Error && err.message === 'Class not found') {
      return errorJson(requestId, 'Not found', 404);
    }
    console.error('[PATCH /api/admin/classes/[id]]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update class', 500);
  }
}
