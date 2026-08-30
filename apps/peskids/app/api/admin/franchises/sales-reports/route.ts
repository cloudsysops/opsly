import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import type { SalesSource } from '@intcloudsysops/franchise-core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const reports = await getFranchiseService().listSalesReports(actor);
    return successJson(requestId, { ok: true, reports });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: {
    unitId?: string;
    periodStart?: string;
    periodEnd?: string;
    grossSalesMinor?: number;
    excludedSalesMinor?: number;
    netSalesMinor?: number;
    source?: SalesSource;
    sourceReference?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.unitId || !body.periodStart || !body.periodEnd || body.grossSalesMinor == null) {
    return errorJson(requestId, 'unitId, period, grossSalesMinor required', 400);
  }
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const result = await getFranchiseService().reportSales(actor, {
      tenantId: actor.tenantId,
      unitId: body.unitId,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      grossSalesMinor: body.grossSalesMinor,
      refundsMinor: 0,
      taxesMinor: 0,
      excludedSalesMinor: body.excludedSalesMinor ?? 0,
      netSalesMinor: body.netSalesMinor ?? body.grossSalesMinor - (body.excludedSalesMinor ?? 0),
      currency: 'COP',
      source: body.source ?? 'manual',
      sourceReference: body.sourceReference ?? null,
    });
    return successJson(requestId, { ok: true, report: result.report });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
