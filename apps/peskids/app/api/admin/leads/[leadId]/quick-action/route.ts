import { NextRequest } from 'next/server';
import { resolveRequestId, successJson, errorJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isOperationalStaffUser } from '@/lib/staff-user';
import { postPeskidsLeadQuickAction } from '@/lib/services/lead-quick-action.service';

export const dynamic = 'force-dynamic';

type QuickActionBody = {
  action: 'mark_attended' | 'hold' | 'cancel';
  teacher_name?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  hold_until_month?: string;
  reason?: string;
};

type RouteContext = { params: Promise<{ leadId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(request);
  const auth = await validateStaffSession();

  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isOperationalStaffUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { leadId } = await context.params;

  try {
    const body = (await request.json()) as QuickActionBody;

    if (!body.action) {
      return errorJson(requestId, 'Missing action field', 400);
    }

    const result = await postPeskidsLeadQuickAction({
      leadId,
      action: body.action,
      teacherName: body.teacher_name,
      scheduledDate: body.scheduled_date,
      scheduledTime: body.scheduled_time,
      holdUntilMonth: body.hold_until_month,
      reason: body.reason,
    });

    if (!result.ok) {
      return errorJson(requestId, result.error || 'Unknown error', result.status || 400);
    }

    return successJson(requestId, {
      ok: true,
      action: body.action,
      leadId,
      message: `Lead ${body.action === 'mark_attended' ? 'marked as attended' : body.action === 'hold' ? 'put on hold' : 'cancelled'}`,
      trial_class_id: result.trialClassId,
    });
  } catch (error) {
    console.error('Lead quick-action endpoint error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
