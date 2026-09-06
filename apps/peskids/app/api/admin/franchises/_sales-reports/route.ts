import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import {
  franchiseErrorResponse,
  franchiseRoleFromAuth,
  getFranchiseService,
  resolveFranchiseActor,
} from '@/lib/franchise/persist';
import {
  FRANCHISE_ROYALTIES_GATE,
  ModuleDisabledError,
  assertModuleEnabled,
} from '@/lib/runtime/feature-flags';
import { createSalesReportSchema } from '@/lib/validation/franchise.schema';
import { firstZodErrorMessage } from '@/lib/validation/zod-errors';
import type { SalesSource } from '@intcloudsysops/franchise-core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  try {
    // listSalesReports scopes to the actor's assigned units inside the service.
    const actor = await resolveFranchiseActor(auth, requestId);
    const reports = await getFranchiseService().listSalesReports(actor);
    return successJson(requestId, { ok: true, reports });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}

/**
 * POST /api/admin/franchises/sales-reports
 *
 * Money-shaped admin write. `reportSales()` in @intcloudsysops/franchise-persistence
 * asserts the financial-write role, asserts the unit is in the actor's scope and
 * writes a change-log row — so the unit id may come from the body, but it is
 * authorised against the server-derived actor, never trusted on its own.
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);

  try {
    assertModuleEnabled(FRANCHISE_ROYALTIES_GATE);
  } catch (err) {
    if (err instanceof ModuleDisabledError) {
      return errorJson(requestId, 'Sales reporting is not available', 503, 'MODULE_DISABLED');
    }
    throw err;
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }

  const parsed = createSalesReportSchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, firstZodErrorMessage(parsed.error), 400, 'VALIDATION_ERROR');
  }
  const body = parsed.data;

  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const excludedSales = body.excludedSalesMinor ?? 0;
    const result = await getFranchiseService().reportSales(actor, {
      tenantId: actor.tenantId,
      unitId: body.unitId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      grossSales: body.grossSalesMinor,
      refunds: 0,
      taxes: 0,
      excludedSales,
      netSales: body.netSalesMinor ?? body.grossSalesMinor - excludedSales,
      currency: 'COP',
      source: (body.source ?? 'manual') as SalesSource,
      sourceReference: body.sourceReference ?? null,
      createdAt: new Date().toISOString(),
    });

    console.info(
      JSON.stringify({
        component: 'peskids.franchise',
        event: 'sales_report.created',
        request_id: requestId,
        tenant_slug: actor.tenantSlug,
        actor_id: actor.actorId,
        actor_role: franchiseRoleFromAuth(auth),
        unit_id: body.unitId,
        sales_report_id: result.report.id,
      })
    );

    return successJson(requestId, { ok: true, report: result.report });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
