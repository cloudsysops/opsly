import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import { franchiseFindingPostSchema } from '@/lib/validation/franchise-os.schema';

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
  const parsed = franchiseFindingPostSchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }
  const body = parsed.data;
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const finding = await getFranchiseService().addFinding(actor, {
      auditId: body.auditId,
      unitId: body.unitId,
      severity: body.severity,
      notes: body.notes,
      standardRef: body.standardRef ?? null,
    });
    return successJson(requestId, { ok: true, finding });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
