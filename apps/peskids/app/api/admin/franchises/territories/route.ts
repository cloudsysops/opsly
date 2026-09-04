import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const listed = await getFranchiseService().listTerritories(actor);
    return successJson(requestId, { ok: true, ...listed });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: {
    name?: string;
    unitId?: string | null;
    exclusive?: boolean;
    exclusiveFor?: 'fixed_location' | 'home_service' | 'both';
    validFrom?: string;
    validTo?: string | null;
    geo?: { kind: 'municipality'; code?: string | null; name?: string | null };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  if (!body.name || !body.validFrom || !body.geo) {
    return errorJson(requestId, 'name, validFrom and geo required', 400);
  }
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const result = await getFranchiseService().createTerritory(actor, {
      tenantId: actor.tenantId,
      name: body.name,
      unitId: body.unitId ?? null,
      type: 'municipality',
      exclusive: body.exclusive ?? false,
      exclusiveFor: body.exclusiveFor ?? 'both',
      validFrom: body.validFrom,
      validTo: body.validTo ?? null,
      geo: body.geo,
      createdAt: new Date().toISOString(),
    });
    return successJson(requestId, { ok: true, territory: result.territory, conflicts: result.conflicts });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
