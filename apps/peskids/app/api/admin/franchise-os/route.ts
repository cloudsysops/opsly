import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import {
    agreementBoard,
    assertRoyaltyAccess,
    canonicalEvents,
    franchiseRoleFromAuth,
    inspectRoyalty,
    listFranchiseOsUnits,
    networkBoard,
    territoryConflictPayload,
} from '@/lib/services/franchise-os.service';
import type { FranchiseAgreement, RoyaltyRule, SalesReport, Territory } from '@intcloudsysops/franchise-core';

export const dynamic = 'force-dynamic';

const TENANT_ID = 'peskids';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);

  const role = franchiseRoleFromAuth(auth);
  const url = new URL(req.url);
  const view = url.searchParams.get('view') ?? 'units';

  try {
    if (view === 'units' || view === 'network') {
      const units = await listFranchiseOsUnits(TENANT_ID);
      const payload: Record<string, unknown> = {
        ok: true,
        view,
        tenant_slug: 'peskids',
        units,
        events: canonicalEvents(),
        map_provider: 'not_configured',
      };
      if (view === 'network') {
        payload.network = networkBoard({
          nowIso: new Date().toISOString(),
          units,
          calculations: [],
          payments: [],
          agreements: [],
          correctiveActions: [],
        });
      }
      return successJson(requestId, payload);
    }

    if (view === 'royalties') {
      assertRoyaltyAccess(role);
      return successJson(requestId, {
        ok: true,
        view,
        calculations: [] as const,
        note: 'Persist calculations via POST after migration 0098. Engine is versioned in @intcloudsysops/franchise-core.',
      });
    }

    if (view === 'territories') {
      return successJson(requestId, {
        ok: true,
        view,
        territories: [] as const,
        conflicts: [] as const,
        map_provider: 'not_configured',
      });
    }

    if (view === 'agreements') {
      return successJson(requestId, {
        ok: true,
        view,
        agreements: [] as const,
      });
    }

    if (view === 'audits') {
      return successJson(requestId, { ok: true, view, audits: [] as const, findings: [] as const });
    }

    return errorJson(requestId, 'Unknown view', 400);
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) : 500;
    const message = err instanceof Error ? err.message : 'franchise-os failed';
    if (status === 403) return errorJson(requestId, message, 403);
    console.error('[GET /api/admin/franchise-os]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to load franchise OS', 500);
  }
}

type CalculateBody = {
  action?: string;
  rule?: RoyaltyRule;
  report?: SalesReport;
  territories?: Territory[];
  agreements?: FranchiseAgreement[];
};

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);
  const role = franchiseRoleFromAuth(auth);

  let body: CalculateBody;
  try {
    body = (await req.json()) as CalculateBody;
  } catch {
    return errorJson(requestId, 'Invalid JSON', 400);
  }

  try {
    if (body.action === 'inspect_royalty') {
      assertRoyaltyAccess(role);
      if (!body.rule || !body.report) return errorJson(requestId, 'rule and report required', 400);
      const calculation = inspectRoyalty({
        id: crypto.randomUUID(),
        unitId: body.report.unitId,
        rule: body.rule,
        report: body.report,
        calculatedAt: new Date().toISOString(),
      });
      return successJson(requestId, { ok: true, calculation });
    }

    if (body.action === 'territory_conflicts') {
      return successJson(requestId, {
        ok: true,
        conflicts: territoryConflictPayload(body.territories ?? []),
      });
    }

    if (body.action === 'agreement_alerts') {
      return successJson(requestId, {
        ok: true,
        board: agreementBoard(body.agreements ?? [], new Date().toISOString()),
      });
    }

    return errorJson(requestId, 'Unknown action', 400);
  } catch (err) {
    const status = typeof err === 'object' && err && 'status' in err ? Number(err.status) : 500;
    const message = err instanceof Error ? err.message : 'franchise-os failed';
    if (status === 403) return errorJson(requestId, message, 403);
    console.error('[POST /api/admin/franchise-os]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to run franchise OS action', 500);
  }
}
