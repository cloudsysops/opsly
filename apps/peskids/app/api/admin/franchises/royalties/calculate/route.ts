import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import {
  franchiseErrorResponse,
  franchiseRoleFromAuth,
  getFranchiseService,
  resolveFranchiseActor,
} from '@/lib/franchise/persist';
import { createSupabaseFranchiseStore } from '@intcloudsysops/franchise-persistence';
import { canWriteFinancial } from '@intcloudsysops/franchise-core';
import { supabaseServer } from '@/lib/supabase';
import {
  FRANCHISE_ROYALTIES_GATE,
  ModuleDisabledError,
  assertModuleEnabled,
} from '@/lib/runtime/feature-flags';
import { calculateRoyaltySchema } from '@/lib/validation/franchise.schema';
import { firstZodErrorMessage } from '@/lib/validation/zod-errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/franchises/royalties/calculate
 *
 * Money-shaped admin write. Order is fixed:
 *   authenticate -> module gate -> derive role from session -> authorize
 *   financial write -> validate payload -> derive tenant/unit scope -> persist.
 *
 * Previously this route created royalty *rules* by calling the store directly,
 * which skipped `assertRoyaltyWrite` — any staff session (including a teacher)
 * could insert a rule, and no change-log row was written.
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);

  try {
    assertModuleEnabled(FRANCHISE_ROYALTIES_GATE);
  } catch (err) {
    if (err instanceof ModuleDisabledError) {
      return errorJson(requestId, 'Royalty calculation is not available', 503, 'MODULE_DISABLED');
    }
    throw err;
  }

  // Role comes from the session only — never from the body.
  const role = franchiseRoleFromAuth(auth);
  const financial = canWriteFinancial(role);
  if (!financial.allow) {
    return errorJson(requestId, 'Forbidden', 403, 'FORBIDDEN');
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }

  const parsed = calculateRoyaltySchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, firstZodErrorMessage(parsed.error), 400, 'VALIDATION_ERROR');
  }
  const body = parsed.data;

  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const service = getFranchiseService();

    let ruleId = body.ruleId;
    let ruleVersion = body.ruleVersion ?? 1;

    if (!ruleId && body.rule) {
      const store = createSupabaseFranchiseStore(supabaseServer());
      const percentageBps = body.rule.percentageBps ?? 500;
      const minimumAmountMinor = body.rule.minimumAmountMinor ?? null;
      const fixedFeeMinor = body.rule.fixedFeeMinor ?? 0;

      const created = await store.insertRoyaltyRule(actor, {
        id: crypto.randomUUID(),
        tenantId: actor.tenantId,
        name: body.rule.name ?? 'Standard',
        basis: body.rule.basis === 'net_sales' ? 'net_sales' : 'gross_sales',
        // The API speaks basis points; franchise-core stores percentage points.
        percentage: percentageBps / 100,
        minimumAmount:
          minimumAmountMinor === null ? null : { amount: minimumAmountMinor, currency: 'COP' },
        fixedFee: { amount: fixedFeeMinor, currency: 'COP' },
        currency: 'COP',
        frequency: 'monthly',
        excludedCategories: body.rule.excludedCategories ?? [],
        taxTreatment: 'gross',
        effectiveFrom: body.rule.effectiveFrom ?? new Date().toISOString().slice(0, 10),
        effectiveTo: body.rule.effectiveTo ?? null,
        createdAt: new Date().toISOString(),
        version: 1,
      });
      ruleId = created.id;
      ruleVersion = created.version;

      console.info(
        JSON.stringify({
          component: 'peskids.franchise',
          event: 'royalty_rule.created',
          request_id: requestId,
          tenant_slug: actor.tenantSlug,
          actor_id: actor.actorId,
          actor_role: role,
          royalty_rule_id: created.id,
        })
      );
    }

    if (!body.reportId || !ruleId) {
      return errorJson(requestId, 'reportId and ruleId (or rule) required', 400, 'VALIDATION_ERROR');
    }

    const result = await service.calculateFromReport(actor, {
      reportId: body.reportId,
      ruleId,
      ruleVersion,
    });

    console.info(
      JSON.stringify({
        component: 'peskids.franchise',
        event: 'royalty.calculated',
        request_id: requestId,
        tenant_slug: actor.tenantSlug,
        actor_id: actor.actorId,
        actor_role: role,
        report_id: body.reportId,
        royalty_rule_id: ruleId,
      })
    );

    return successJson(requestId, { ok: true, calculation: result.calculation });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
