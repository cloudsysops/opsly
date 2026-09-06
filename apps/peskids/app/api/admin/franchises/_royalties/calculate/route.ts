import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import { createSupabaseFranchiseStore } from '@intcloudsysops/franchise-persistence';
import { supabaseServer } from '@/lib/supabase';
import type { RoyaltyRule } from '@intcloudsysops/franchise-core';
import { franchiseRoyaltyCalculatePostSchema } from '@/lib/validation/franchise-os.schema';

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
  const parsed = franchiseRoyaltyCalculatePostSchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }
  const body = parsed.data;
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const service = getFranchiseService();
    let ruleId = body.ruleId;
    let ruleVersion = body.ruleVersion ?? 1;
    if (!ruleId && body.rule) {
      const store = createSupabaseFranchiseStore(supabaseServer());
      const created = await store.insertRoyaltyRule(actor, {
        id: crypto.randomUUID(),
        tenantId: actor.tenantId,
        name: body.rule.name ?? 'Standard',
        basis: body.rule.basis ?? 'gross_sales',
        percentageBps: body.rule.percentageBps ?? 500,
        minimumAmountMinor: body.rule.minimumAmountMinor ?? null,
        fixedFeeMinor: body.rule.fixedFeeMinor ?? 0,
        currency: 'COP',
        frequency: 'monthly',
        excludedCategories: body.rule.excludedCategories ?? [],
        taxTreatment: 'unspecified',
        effectiveFrom: body.rule.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        effectiveTo: body.rule.effectiveTo ?? null,
        version: 1,
      });
      ruleId = created.id;
      ruleVersion = created.version;
    }
    if (!body.reportId || !ruleId) {
      return errorJson(requestId, 'reportId and ruleId (or rule) required', 400);
    }
    const result = await service.calculateFromReport(actor, {
      reportId: body.reportId,
      ruleId,
      ruleVersion,
    });
    return successJson(requestId, { ok: true, calculation: result.calculation });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
