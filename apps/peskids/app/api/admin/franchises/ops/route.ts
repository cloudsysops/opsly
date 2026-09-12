import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { franchiseErrorResponse, getFranchiseService, resolveFranchiseActor } from '@/lib/franchise/persist';
import type { FranchiseRole } from '@intcloudsysops/franchise-core';

export const dynamic = 'force-dynamic';

type OpsKind = 'standards' | 'suppliers' | 'training' | 'support' | 'documents';

function parseKind(value: string | null): OpsKind | null {
  if (
    value === 'standards' ||
    value === 'suppliers' ||
    value === 'training' ||
    value === 'support' ||
    value === 'documents'
  ) {
    return value;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const service = getFranchiseService();
    const [standards, suppliers, training, support, documents] = await Promise.all([
      service.listBrandStandards(actor),
      service.listSuppliers(actor),
      service.listTrainingCompletions(actor),
      service.listSupportCases(actor),
      service.listDocuments(actor),
    ]);
    return successJson(requestId, { ok: true, standards, suppliers, training, support, documents });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}

type OpsBody = {
  kind?: string;
  category?: string;
  code?: string;
  title?: string;
  requirement?: string;
  name?: string;
  status?: string;
  policy?: string;
  externalRef?: string;
  role?: FranchiseRole;
  unitId?: string;
  requirementId?: string;
  completedAt?: string;
  expiresAt?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  slaHours?: number | null;
  kindDoc?: string;
  uri?: string;
};

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  let body: OpsBody;
  try {
    body = (await req.json()) as OpsBody;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }
  const kind = parseKind(body.kind ?? null);
  if (!kind) return errorJson(requestId, 'kind required', 400);
  try {
    const actor = await resolveFranchiseActor(auth, requestId);
    const service = getFranchiseService();
    if (kind === 'standards') {
      if (!body.code || !body.title || !body.requirement || !body.category) {
        return errorJson(requestId, 'category, code, title, requirement required', 400);
      }
      const created = await service.createBrandStandard(actor, {
        category: body.category,
        code: body.code,
        title: body.title,
        requirement: body.requirement,
        evidenceType: 'document',
        severity: 'medium',
        version: 1,
      });
      return successJson(requestId, { ok: true, ...created });
    }
    if (kind === 'suppliers') {
      if (!body.name || !body.category) return errorJson(requestId, 'name and category required', 400);
      const created = await service.createSupplier(actor, {
        name: body.name,
        category: body.category,
        status: (body.status as 'approved' | 'conditional' | 'suspended' | 'expired') ?? 'approved',
        policy: (body.policy as 'mandatory' | 'approved_only' | 'recommended') ?? 'approved_only',
      });
      return successJson(requestId, { ok: true, ...created });
    }
    if (kind === 'training') {
      if (body.requirementId && body.unitId && body.completedAt) {
        const created = await service.recordTrainingCompletion(actor, {
          unitId: body.unitId,
          requirementId: body.requirementId,
          completedAt: body.completedAt,
          expiresAt: body.expiresAt ?? null,
          status: 'completed',
        });
        return successJson(requestId, { ok: true, ...created });
      }
      if (!body.externalRef || !body.role) return errorJson(requestId, 'externalRef and role required', 400);
      const created = await service.createTrainingRequirement(actor, {
        externalRef: body.externalRef,
        role: body.role,
        required: true,
        validForMonths: 12,
        certificationRequired: true,
      });
      return successJson(requestId, { ok: true, ...created });
    }
    if (kind === 'support') {
      if (!body.unitId || !body.category) return errorJson(requestId, 'unitId and category required', 400);
      const created = await service.createSupportCase(actor, {
        unitId: body.unitId,
        category: body.category,
        priority: body.priority ?? 'medium',
        status: 'open',
        slaHours: body.slaHours ?? 24,
        assignedTo: null,
        resolution: null,
      });
      return successJson(requestId, { ok: true, ...created });
    }
    if (!body.uri) return errorJson(requestId, 'uri required', 400);
    const created = await service.registerDocument(actor, {
      kind: (body.kindDoc as 'brand_guide') ?? 'brand_guide',
      uri: body.uri,
      visibility: 'network',
      ownerScope: 'network',
      version: '1',
      expiresAt: null,
      unitId: body.unitId ?? null,
    });
    return successJson(requestId, { ok: true, ...created });
  } catch (err) {
    return franchiseErrorResponse(requestId, err);
  }
}
