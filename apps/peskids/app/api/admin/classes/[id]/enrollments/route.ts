import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { listEnrollmentsForClass } from '@/lib/services/enrollment.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id } = await context.params;

  try {
    const enrollments = await listEnrollmentsForClass(id);
    return successJson(requestId, { ok: true, enrollments });
  } catch (err) {
    console.error('[GET enrollments]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list enrollments', 500);
  }
}
