import { NextRequest } from 'next/server';
import { resolveRequestId, successJson, errorJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isOperationalStaffUser } from '@/lib/staff-user';
import { leadQuickActionSchema } from '@/lib/validation/lead-quick-action.schema';
import { postPeskidsLeadQuickAction } from '@/lib/services/lead-quick-action.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function quickActionMessage(action: string): string {
  if (action === 'mark_attended') return 'marked as attended';
  if (action === 'mark_enrolled') return 'marked as enrolled';
  if (action === 'hold') return 'put on hold';
  return 'cancelled';
}

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(request);
  const auth = await validateStaffSession();

  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isOperationalStaffUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { id: leadId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = leadQuickActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const result = await postPeskidsLeadQuickAction({
      leadId,
      action: parsed.data.action,
      teacherName: parsed.data.teacher_name,
      scheduledDate: parsed.data.scheduled_date,
      scheduledTime: parsed.data.scheduled_time,
      holdUntilMonth: parsed.data.hold_until_month,
      reason: parsed.data.reason,
    });

    if (!result.ok) {
      return errorJson(requestId, result.error || 'Unknown error', result.status || 400);
    }

    return successJson(requestId, {
      ok: true,
      action: parsed.data.action,
      leadId,
      message: `Lead ${quickActionMessage(parsed.data.action)}`,
      trial_class_id: result.trialClassId,
    });
  } catch (error) {
    console.error('Lead quick-action endpoint error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
