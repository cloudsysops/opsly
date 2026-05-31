import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { EnrollmentNotAllowedError } from '@/lib/class-types';
import { cancelEnrollment } from '@/lib/services/enrollment.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id } = await context.params;

  try {
    const enrollment = await cancelEnrollment(id, auth.user.id);
    return successJson(requestId, { ok: true, enrollment });
  } catch (err) {
    if (err instanceof EnrollmentNotAllowedError) {
      return errorJson(requestId, err.message, 409);
    }
    console.error('[DELETE enrollment]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to cancel enrollment', 500);
  }
}
