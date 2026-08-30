import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: { findingId?: string; unitId?: string; owner?: string; dueDate?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.findingId || !body.unitId || !body.owner || !body.dueDate) {
    return errorJson(requestId, 'findingId, unitId, owner, dueDate required', 400);
  }
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const result = await getFranchiseService().addCorrectiveAction(actor, {
      findingId: body.findingId,
      unitId: body.unitId,
      owner: body.owner,
      dueDate: body.dueDate,
    });
    return successJson(requestId, { ok: true, action: result.action });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
