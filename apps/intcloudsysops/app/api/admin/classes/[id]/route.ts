import { NextRequest } from 'next/server';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { teacherUpdateClassSchema, updateClassSchema } from '@/lib/validation/class.schema';
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

function shiftEndsAtIfNeeded(
  existingStartsAt: string,
  existingEndsAt: string,
  newStartsAt: string
): string {
  const duration =
    new Date(existingEndsAt).getTime() - new Date(existingStartsAt).getTime();
  return new Date(new Date(newStartsAt).getTime() + duration).toISOString();
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const isAdmin = Boolean(auth.user && isAdminSurfaceUser(auth.user));
  const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;

  if (!isAdmin && role !== 'teacher') {
    return errorJson(requestId, 'Forbidden', 403);
  }

  if (!isAdmin) {
    const classItem = await getClassById(id);
    if (!classItem) {
      return errorJson(requestId, 'Not found', 404);
    }
    if (!auth.user || classItem.professor_user_id !== auth.user.id) {
      return errorJson(requestId, 'Forbidden', 403);
    }

    const parsed = teacherUpdateClassSchema.safeParse(body);
    if (!parsed.success) {
      return errorJson(requestId, 'Invalid payload', 400);
    }

    const patch = { ...parsed.data };
    if (patch.starts_at && !patch.ends_at) {
      patch.ends_at = shiftEndsAtIfNeeded(
        classItem.starts_at,
        classItem.ends_at,
        patch.starts_at
      );
    }

    try {
      const updated = await updateClass(id, patch);
      return successJson(requestId, { ok: true, class: updated });
    } catch (err) {
      if (err instanceof ClassScheduleConflictError) {
        return errorJson(requestId, err.message, 409);
      }
      if (err instanceof Error && err.message === 'Class not found') {
        return errorJson(requestId, 'Not found', 404);
      }
      console.error('[PATCH /api/admin/classes/[id]] teacher', err, { request_id: requestId });
      return errorJson(requestId, 'Failed to update class', 500);
    }
  }

  const parsed = updateClassSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  const patch = { ...parsed.data };
  if (patch.starts_at && !patch.ends_at) {
    const classItem = await getClassById(id);
    if (!classItem) {
      return errorJson(requestId, 'Not found', 404);
    }
    patch.ends_at = shiftEndsAtIfNeeded(classItem.starts_at, classItem.ends_at, patch.starts_at);
  }

  try {
    const updated = await updateClass(id, patch);
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
