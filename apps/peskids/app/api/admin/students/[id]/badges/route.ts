import { NextRequest } from 'next/server';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { createBadgeSchema } from '@/lib/validation/badge.schema';
import { getStudentById } from '@/lib/services/student.service';
import {
  createBadge,
  listBadgesForStudent,
  teacherTaughtStudent,
} from '@/lib/services/badge.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id: studentId } = await context.params;

  try {
    const badges = await listBadgesForStudent(studentId);
    return successJson(requestId, { ok: true, badges });
  } catch (err) {
    console.error('[GET /api/admin/students/[id]/badges]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list badges', 500);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id: studentId } = await context.params;

  const student = await getStudentById(studentId);
  if (!student) {
    return errorJson(requestId, 'Not found', 404);
  }

  const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
  if (auth.method === 'supabase' && role === 'teacher' && auth.user) {
    const allowed = await teacherTaughtStudent(auth.user.id, studentId);
    if (!allowed) {
      return errorJson(requestId, 'Forbidden', 403);
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createBadgeSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const badge = await createBadge({
      studentId,
      label: parsed.data.label,
      classId: parsed.data.class_id,
      awardedBy: auth.user?.id ?? null,
      awardedByRole:
        role === 'owner' || role === 'admin' || role === 'support' || role === 'teacher'
          ? role
          : null,
    });
    return successJson(requestId, { ok: true, badge }, 201);
  } catch (err) {
    console.error('[POST /api/admin/students/[id]/badges]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to create badge', 500);
  }
}
