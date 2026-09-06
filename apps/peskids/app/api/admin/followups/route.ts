import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isOperationalStaffUser } from '@/lib/staff-user';
import { createFollowupSchema } from '@/lib/validation/followup.schema';
import { createFollowup, listFollowups } from '@/lib/services/followup-admin.service';
import type { FollowupRow } from '@/lib/services/followup-admin.service';

export const dynamic = 'force-dynamic';

function parseStatus(value: string | null): FollowupRow['status'] | undefined {
  if (!value) return undefined;
  const allowed: FollowupRow['status'][] = ['pending', 'completed', 'cancelled'];
  return allowed.includes(value as FollowupRow['status'])
    ? (value as FollowupRow['status'])
    : undefined;
}

function parseContactType(value: string | null): FollowupRow['contact_type'] | undefined {
  if (!value) return undefined;
  const allowed: FollowupRow['contact_type'][] = ['lead', 'student', 'parent'];
  return allowed.includes(value as FollowupRow['contact_type'])
    ? (value as FollowupRow['contact_type'])
    : undefined;
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const status = parseStatus(req.nextUrl.searchParams.get('status'));
    const contactType = parseContactType(req.nextUrl.searchParams.get('contact_type'));
    const contactId = req.nextUrl.searchParams.get('contact_id') ?? undefined;
    const followups = await listFollowups({
      status,
      contact_type: contactType,
      contact_id: contactId,
    });

    return successJson(requestId, { ok: true, followups });
  } catch (err) {
    console.error('[GET /api/admin/followups]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list followups', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isOperationalStaffUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createFollowupSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const created = await createFollowup(parsed.data);
    return successJson(requestId, { ok: true, followup: created }, 201);
  } catch (err) {
    console.error('[POST /api/admin/followups]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to create followup', 500);
  }
}
