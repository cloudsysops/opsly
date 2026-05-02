import { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../lib/constants';
import { getInsightsForTenant } from '../../../../../../lib/insights/engine';
import { applyInsightPatchAction } from '../../../../../../lib/insights/insight-patch-actions';
import { runTrustedPortalDalForPathSlug } from '../../../../../../lib/portal-tenant-dal';

type PortalInsightRow = {
  id: string;
  tenant_id: string;
  insight_type: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  confidence: unknown;
  impact_score: unknown;
  status: string;
  read_at: string | null;
  actioned_at: string | null;
  created_at: string;
};

type PortalInsightResponse = {
  id: string;
  tenant_id: string;
  insight_type: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  confidence: number;
  impact_score: number;
  status: string;
  read_at: string | null;
  actioned_at: string | null;
  created_at: string;
};

type InsightPatchBody = {
  insight_id?: string;
  action?: string;
};

function normalizeInsight(row: PortalInsightRow): PortalInsightResponse {
  const conf =
    typeof row.confidence === 'string' ? Number.parseFloat(row.confidence) : Number(row.confidence);
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    insight_type: row.insight_type,
    title: row.title,
    summary: row.summary,
    payload: row.payload,
    confidence: Number.isFinite(conf) ? conf : 0,
    impact_score: Number(row.impact_score ?? 0),
    status: row.status,
    read_at: row.read_at,
    actioned_at: row.actioned_at,
    created_at: row.created_at,
  };
}

async function parsePatchBody(
  request: NextRequest
): Promise<{ ok: true; body: InsightPatchBody } | { ok: false; response: Response }> {
  try {
    return {
      ok: true,
      body: (await request.json()) as InsightPatchBody,
    };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST }),
    };
  }
}

function validateInsightPatchBody(
  body: InsightPatchBody
): { ok: true; insightId: string; action: string } | { ok: false; response: Response } {
  const insightId = body.insight_id?.trim();
  const action = body.action?.trim();
  if (!insightId || !action) {
    return {
      ok: false,
      response: Response.json(
        { error: 'insight_id and action required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }

  return {
    ok: true,
    insightId,
    action,
  };
}

function invalidInsightActionResponse(): Response {
  return Response.json(
    { error: 'action must be read, dismiss, or action' },
    { status: HTTP_STATUS.BAD_REQUEST }
  );
}

function insightPatchErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'update failed';
  const status =
    message === 'Insight not found' ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.INTERNAL_ERROR;
  return Response.json({ error: message }, { status });
}

/**
 * Insights predictivos (Zero-Trust): el slug del path debe coincidir con la sesión.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, async (session) => {
    const rows = await getInsightsForTenant(session.tenant.id, {
      includeRead: true,
      limit: 40,
    });

    return Response.json({
      tenant_slug: slug,
      insights: rows.map(normalizeInsight),
    });
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return runTrustedPortalDalForPathSlug(request, slug, async (session) => {
    const parsedBody = await parsePatchBody(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const validatedPatch = validateInsightPatchBody(parsedBody.body);
    if (!validatedPatch.ok) {
      return validatedPatch.response;
    }

    try {
      const applied = await applyInsightPatchAction(
        validatedPatch.action,
        validatedPatch.insightId,
        session.tenant.id
      );
      if (!applied) {
        return invalidInsightActionResponse();
      }

      return Response.json({ ok: true });
    } catch (e) {
      return insightPatchErrorResponse(e);
    }
  });
}
