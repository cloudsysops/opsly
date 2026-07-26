import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { importStudentsFromRows } from '@/lib/services/data-import.service';
import { studentImportBodySchema } from '@/lib/validation/improvement-chat.schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }
  if (auth.method === 'supabase' && auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  try {
    const json = await req.json();
    const parsed = studentImportBodySchema.safeParse(json);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const result = await importStudentsFromRows(parsed.data);
    return successJson(requestId, result, 201);
  } catch (err) {
    console.error('[POST /api/admin/students/import]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to import students', 500);
  }
}
