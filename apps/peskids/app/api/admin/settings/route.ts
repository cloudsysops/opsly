import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { updateTenantSettingsSchema } from '@/lib/validation/tenant-settings.schema';
import { getTenantSettings, updateTenantSettings } from '@/lib/services/tenant-settings.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const settings = await getTenantSettings();
    return successJson(requestId, { ok: true, settings });
  } catch (err) {
    console.error('[GET /api/admin/settings]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to load settings', 500);
  }
}

export async function PATCH(req: NextRequest) {
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

  const parsed = updateTenantSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const settings = await updateTenantSettings(parsed.data);
    return successJson(requestId, { ok: true, settings });
  } catch (err) {
    console.error('[PATCH /api/admin/settings]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update settings', 500);
  }
}
