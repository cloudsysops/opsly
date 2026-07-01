import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { createStudentSchema } from '@/lib/validation/student.schema';
import { createStudent, listStudents } from '@/lib/services/student.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const students = await listStudents({
      search: req.nextUrl.searchParams.get('search') ?? undefined,
      grade: req.nextUrl.searchParams.get('grade') ?? undefined,
      status: req.nextUrl.searchParams.get('status') ?? undefined,
    });

    return successJson(requestId, { ok: true, students });
  } catch (err) {
    console.error('[GET /api/admin/students]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list students', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createStudentSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const created = await createStudent(parsed.data);
    return successJson(requestId, { ok: true, student: created }, 201);
  } catch (err) {
    console.error('[POST /api/admin/students]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to create student', 500);
  }
}
