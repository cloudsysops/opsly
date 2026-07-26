import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { isPeskidsStaffImprovementChatEnabled } from '@/lib/peskids-pro-flags';
import { listChangeRequestsQuerySchema } from '@/lib/validation/improvement-chat.schema';
import { listChangeRequests } from '@/lib/services/improvement-chat.service';

export const dynamic = 'force-dynamic';

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
 * GET /api/admin/change-requests?status=&priority=&category=
 * Lists staff change requests for human triage. Read-only — no execution.
 */
export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Change-request intake is not enabled', 404);
  }

  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = listChangeRequestsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid filters', 400);
  }

  try {
    const requests = await listChangeRequests(parsed.data);
    return successJson(requestId, { ok: true, requests });
  } catch (err) {
    console.error('[GET /api/admin/change-requests]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list change requests', 500);
  }
}
