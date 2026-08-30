import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: {
    auditId?: string;
    unitId?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    notes?: string;
    standardRef?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.auditId || !body.unitId || !body.severity || !body.notes) {
    return errorJson(requestId, 'auditId, unitId, severity, notes required', 400);
  }
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
