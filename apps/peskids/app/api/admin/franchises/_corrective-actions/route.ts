import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import { franchiseCorrectiveActionPostSchema } from '@/lib/validation/franchise-os.schema';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  const parsed = franchiseCorrectiveActionPostSchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }
  const body = parsed.data;
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
