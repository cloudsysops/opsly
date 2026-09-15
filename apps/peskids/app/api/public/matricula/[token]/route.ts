import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { ENROLLMENT_LINK_UNAVAILABLE } from '@/lib/enrollment-access/token';
import { resolveEnrollmentToken } from '@/lib/enrollment-access/resolve';
import { submitEnrollmentForm } from '@/lib/enrollment-access/submit';
import { supabaseEnrollmentLeadStore } from '@/lib/enrollment-access/store';
import { emitEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const { token } = await context.params;
  const resolved = await resolveEnrollmentToken({
    store: supabaseEnrollmentLeadStore,
    rawToken: token,
    mode: 'open',
    markOpened: true,
    requestId,
  });

  if (!resolved.ok) {
    return errorJson(requestId, ENROLLMENT_LINK_UNAVAILABLE, 404);
  }

  if (resolved.lead.metadata.enrollment_access?.opened_at) {
    void emitEvent('enrollment.link.opened', { lead_id: resolved.lead.id }).catch(() => undefined);
  }

  return successJson(requestId, {
    ok: true,
    purpose: 'enrollment',
    already_submitted: resolved.already_submitted,
    next_action: resolved.already_submitted ? 'PREPARE_FIRST_CLASS' : 'COMPLETE_ENROLLMENT_FORM',
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  try {
    const result = await submitEnrollmentForm({
      store: supabaseEnrollmentLeadStore,
      rawToken: token,
      body,
      requestId,
    });
    if (!result.ok) {
      return errorJson(requestId, result.error, result.status);
    }
    return successJson(requestId, result);
  } catch (error) {
    console.error('[POST /api/public/matricula/[token]]', {
      request_id: requestId,
      error: error instanceof Error ? error.message : 'submit_failed',
    });
    return errorJson(requestId, 'No se pudo completar la matrícula', 500);
  }
}
