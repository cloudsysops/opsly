import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { agreementBoard } from '@/lib/services/franchise-os.service';
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
    const agreements = await getFranchiseService().listAgreements(actor);
    return successJson(requestId, {
      ok: true,
      agreements,
      board: agreementBoard(agreements, new Date().toISOString()),
    });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: {
    legalName?: string;
    unitIds?: string[];
    effectiveDate?: string;
    expirationDate?: string;
    royaltyRuleId?: string | null;
    territoryId?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.legalName || !body.unitIds?.length || !body.effectiveDate || !body.expirationDate) {
    return errorJson(requestId, 'legalName, unitIds, effectiveDate, expirationDate required', 400);
  }
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const storeService = getFranchiseService();
    const franchisee = await createSupabaseFranchiseStore(supabaseServer()).insertFranchisee(actor, {
      tenantId: actor.tenantId,
      legalName: body.legalName,
      taxId: null,
      status: 'active',
      primaryContact: { name: body.legalName, email: 'franchisee@peskids.local' },
    });
    const result = await storeService.createAgreement(actor, {
      tenantId: actor.tenantId,
      franchiseeId: franchisee.id,
      unitIds: body.unitIds,
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
      renewalType: 'manual',
      renewalTermMonths: 12,
      noticeDays: 90,
      canonicalFee: null,
      royaltyRuleId: body.royaltyRuleId ?? null,
      territoryId: body.territoryId ?? null,
    });
    return successJson(requestId, { ok: true, agreement: result.agreement });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
