import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isOperationalStaffUser } from '@/lib/staff-user';
import { patchLeadAdminSchema } from '@/lib/validation/lead-admin.schema';
import { updateLeadForAdmin } from '@/lib/services/lead-admin.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();

  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isOperationalStaffUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { id } = await context.params;
  const tenantSlug = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = patchLeadAdminSchema.safeParse(body);
  if (!parsed.success) {
    const invalidStatus = parsed.error.issues.some((issue) => issue.path[0] === 'status');
    return errorJson(
      requestId,
      invalidStatus ? 'Invalid status' : 'Invalid payload',
      400
    );
  }

  try {
    const lead = await updateLeadForAdmin(id, tenantSlug, parsed.data);
    if (!lead) {
      return errorJson(requestId, 'Not found', 404);
    }

    return successJson(requestId, { ok: true, lead });
  } catch (err) {
    console.error('[PATCH /api/admin/leads/[id]]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update lead', 500);
  }
}
