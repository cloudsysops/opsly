import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import type { TaskStatus } from '@intcloudsysops/franchise-core';

export const dynamic = 'force-dynamic';

const STATUSES: ReadonlySet<string> = new Set([
  'not_started',
  'in_progress',
  'blocked',
  'completed',
  'skipped',
]);

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: { taskId?: string; status?: string; evidenceUri?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.taskId || !body.status || !STATUSES.has(body.status)) {
    return errorJson(requestId, 'taskId and valid status required', 400);
  }
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const result = await getFranchiseService().completeOpeningTask(actor, {
      taskId: body.taskId,
      status: body.status as TaskStatus,
      evidenceUri: body.evidenceUri ?? null,
    });
    return successJson(requestId, { ok: true, ...result });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
