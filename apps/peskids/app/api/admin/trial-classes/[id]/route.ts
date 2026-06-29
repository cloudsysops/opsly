import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { patchTrialClassSchema } from '@/lib/validation/trial-class.schema';
import { updateTrialClass } from '@/lib/services/trial-class.service';

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

  const parsed = patchTrialClassSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const updated = await updateTrialClass(id, parsed.data);
    if (!updated) {
      return errorJson(requestId, 'Not found', 404);
    }

    return successJson(requestId, { ok: true, trial_class: updated });
  } catch (err) {
    console.error('[PATCH /api/admin/trial-classes/[id]]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update trial class', 500);
  }
}
