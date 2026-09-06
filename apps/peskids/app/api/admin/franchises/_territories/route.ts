import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import { franchiseTerritoryPostSchema } from '@/lib/validation/franchise-os.schema';

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
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  const parsed = franchiseTerritoryPostSchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }
  const body = parsed.data;
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const result = await getFranchiseService().createTerritory(actor, {
      tenantId: actor.tenantId,
      name: body.name,
      unitId: body.unitId ?? null,
      exclusive: body.exclusive ?? false,
      exclusiveFor: body.exclusiveFor ?? 'both',
      validFrom: body.validFrom,
      validTo: body.validTo ?? null,
      geometry: body.geometry,
    });
    return successJson(requestId, { ok: true, territory: result.territory, conflicts: result.conflicts });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
