import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import { createSupabaseFranchiseStore } from '@intcloudsysops/franchise-persistence';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const audits = await getFranchiseService().listAudits(actor);
    return successJson(requestId, { ok: true, audits });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: { unitId?: string; auditor?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.unitId) return errorJson(requestId, 'unitId required', 400);
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const store = createSupabaseFranchiseStore(supabaseServer());
    const template = await store.insertAuditTemplate(actor, {
      name: 'Franchise audit',
      version: 1,
      questions: [],
    });
    const audit = await getFranchiseService().createAudit(actor, {
      tenantId: actor.tenantId,
      unitId: body.unitId,
      templateId: template.id,
      templateVersion: 1,
      auditor: body.auditor ?? actor.actorId,
      scheduledAt: new Date().toISOString(),
      status: 'scheduled',
    });
    return successJson(requestId, { ok: true, audit });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
