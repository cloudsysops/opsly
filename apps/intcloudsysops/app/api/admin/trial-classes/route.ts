import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { createTrialClassSchema } from '@/lib/validation/trial-class.schema';
import { createTrialClass, listTrialClasses } from '@/lib/services/trial-class.service';
import type { TrialClassRow } from '@/lib/services/trial-class.service';

export const dynamic = 'force-dynamic';

function parseStatus(value: string | null): TrialClassRow['status'] | undefined {
  if (!value) return undefined;
  const allowed: TrialClassRow['status'][] = [
    'scheduled',
    'confirmed',
    'attended',
    'no_show',
    'cancelled',
  ];
  return allowed.includes(value as TrialClassRow['status'])
    ? (value as TrialClassRow['status'])
    : undefined;
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const leadId = req.nextUrl.searchParams.get('lead_id') ?? undefined;
    const status = parseStatus(req.nextUrl.searchParams.get('status'));
    const trialClasses = await listTrialClasses({ lead_id: leadId, status });

    return successJson(requestId, { ok: true, trial_classes: trialClasses });
  } catch (err) {
    console.error('[GET /api/admin/trial-classes]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list trial classes', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createTrialClassSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const created = await createTrialClass(parsed.data);
    return successJson(requestId, { ok: true, trial_class: created }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create trial class';
    if (message === 'Lead not found') {
      return errorJson(requestId, 'Not found', 404);
    }
    console.error('[POST /api/admin/trial-classes]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to create trial class', 500);
  }
}
