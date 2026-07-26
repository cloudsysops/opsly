import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { isPeskidsStaffImprovementChatEnabled } from '@/lib/peskids-pro-flags';
import { patchChangeRequestSchema } from '@/lib/validation/improvement-chat.schema';
import { patchChangeRequest } from '@/lib/services/improvement-chat.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function requireAdminSurface(
  auth: Awaited<ReturnType<typeof validateStaffRequest>>
): { ok: true } | { ok: false; status: number; error: string } {
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }
  if (auth.method === 'secret') {
    return { ok: true };
  }
  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

/**
 * PATCH /api/admin/change-requests/[id]
 * Updates status / operator_notes / linked_pr / linked_issue.
 * Admin only. Never executes the change request.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Change-request intake is not enabled', 404);
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = patchChangeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid payload', 400);
  }

  try {
    const result = await patchChangeRequest(id, parsed.data);
    if (!result.ok) {
      if (result.error === 'not_found') {
        return errorJson(requestId, 'Not found', 404);
      }
      if (result.error === 'not_staff') {
        return errorJson(requestId, 'Only staff change requests can be updated', 400);
      }
      return errorJson(requestId, 'Invalid status transition', 409);
    }
    return successJson(requestId, { ok: true, request: result.message });
  } catch (err) {
    console.error('[PATCH /api/admin/change-requests/[id]]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update change request', 500);
  }
}
