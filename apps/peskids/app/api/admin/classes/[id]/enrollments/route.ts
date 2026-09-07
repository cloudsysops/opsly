import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { classBelongsToTeacher, listEnrollmentsForClass } from '@/lib/services/enrollment.service';
import { maySeeGuardianContact } from '@/lib/privacy/pii-projections';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/classes/[id]/enrollments — class roster.
 *
 * authenticate -> derive role from the session -> authorize the class ->
 * project the response for that role.
 *
 * Two fixes here:
 *  - a teacher could previously read ANY class's roster, not just their own;
 *  - the roster always carried the guardian's email, which attendance-taking
 *    does not need. Teachers now get it only when the tenant opts in via
 *    PESKIDS_TEACHER_FAMILY_CONTACT_ENABLED.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { id } = await context.params;
  const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : undefined;
  // A DASHBOARD_ADMIN_SECRET session is the tenant owner credential.
  const effectiveRole = auth.method === 'secret' && !auth.user ? 'owner' : role;

  if (effectiveRole === 'teacher') {
    const ownsClass = auth.user ? await classBelongsToTeacher(id, auth.user.id) : false;
    if (!ownsClass) {
      console.warn(
        JSON.stringify({
          component: 'peskids.api',
          event: 'class_roster_denied',
          request_id: requestId,
          actor_id: auth.user?.id ?? null,
          class_id: id,
          reason: 'teacher_not_assigned',
        })
      );
      return errorJson(requestId, 'Forbidden', 403);
    }
  }

  try {
    const enrollments = await listEnrollmentsForClass(id, {
      includeGuardianContact: maySeeGuardianContact(effectiveRole),
    });
    return successJson(requestId, { ok: true, enrollments });
  } catch (err) {
    console.error(
      JSON.stringify({
        component: 'peskids.api',
        event: 'class_roster_failed',
        request_id: requestId,
        class_id: id,
        error: err instanceof Error ? err.message : 'unknown',
      })
    );
    return errorJson(requestId, 'Failed to list enrollments', 500);
  }
}
