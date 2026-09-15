import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { listDataBackups, saveDataBackup } from '@/lib/services/data-backup.service';
import { dataBackupUploadSchema } from '@/lib/validation/data-backup.schema';

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
    const parsed = dataBackupUploadSchema.safeParse(json);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const backup = await saveDataBackup(parsed.data, auth.user?.email ?? null);
    return successJson(requestId, { ok: true, backup }, 201);
  } catch (err) {
    console.error('[POST /api/admin/data-backups]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to save backup', 500);
  }
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }
  if (auth.method === 'supabase' && auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  try {
    const backups = await listDataBackups();
    return successJson(requestId, { ok: true, backups });
  } catch (err) {
    console.error('[GET /api/admin/data-backups]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list backups', 500);
  }
}
