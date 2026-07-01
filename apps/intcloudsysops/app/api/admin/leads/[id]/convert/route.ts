import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { convertLeadToStudent } from '@/lib/services/lead-conversion.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();

  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { id } = await context.params;
  const tenantSlug = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();

  try {
    const result = await convertLeadToStudent(id, tenantSlug);
    if (!result) {
      return errorJson(requestId, 'Not found', 404);
    }

    return successJson(
      requestId,
      { ok: true, student: result.student, lead: result.lead },
      201
    );
  } catch (err) {
    console.error('[POST /api/admin/leads/[id]/convert]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to convert lead', 500);
  }
}
