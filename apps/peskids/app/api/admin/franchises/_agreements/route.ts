import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { agreementBoard } from '@/lib/franchise/agreement-board';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import { franchiseAgreementPostSchema } from '@/lib/validation/franchise-os.schema';
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
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  const parsed = franchiseAgreementPostSchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }
  const body = parsed.data;
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const storeService = getFranchiseService();
    const franchisee = await createSupabaseFranchiseStore(supabaseServer()).insertFranchisee(actor, {
      tenantId: actor.tenantId,
      legalName: body.legalName,
      taxId: null,
      status: 'active',
      primaryContact: { name: body.legalName, email: 'franchisee@peskids.local', phone: null },
    });
    const result = await storeService.createAgreement(actor, {
      tenantId: actor.tenantId,
      franchiseeId: franchisee.id,
      unitIds: body.unitIds,
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
      renewalType: 'franchisor_discretion',
      renewalTermMonths: 12,
      noticeDays: 90,
      canonicalFeeMinor: 0,
      currency: 'COP',
      royaltyRuleId: body.royaltyRuleId ?? null,
      territoryId: body.territoryId ?? null,
      documentRef: null,
    });
    return successJson(requestId, { ok: true, agreement: result.agreement });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
