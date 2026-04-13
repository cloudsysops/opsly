import { NextRequest } from "next/server";
import { HTTP_STATUS } from "../../../../../../lib/constants";
import { getInsightsForTenant } from "../../../../../../lib/insights/engine";
import { applyInsightPatchAction } from "../../../../../../lib/insights/insight-patch-actions";
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from "../../../../../../lib/portal-trusted-identity";

type InsightRow = {
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

type NormalizedInsight = {
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

function normalizeInsight(row: InsightRow): NormalizedInsight {
  const conf =
    typeof row.confidence === "string"
      ? Number.parseFloat(row.confidence)
      : Number(row.confidence);
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

async function parseInsightPatchBody(
  request: NextRequest,
): Promise<
  | { ok: true; insightId: string; action: string }
  | { ok: false; response: Response }
> {
  let body: { insight_id?: string; action?: string };
  try {
    body = (await request.json()) as { insight_id?: string; action?: string };
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid JSON" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  const insightId = body.insight_id?.trim();
  const action = body.action?.trim();
  if (!insightId || !action) {
    return {
      ok: false,
      response: Response.json(
        { error: "insight_id and action required" },
        { status: HTTP_STATUS.BAD_REQUEST },
      ),
    };
  }

  return { ok: true, insightId, action };
}

/**
 * Insights predictivos (Zero-Trust): el slug del path debe coincidir con la sesión.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(_request);
  if (!trusted.ok) {
    return trusted.response;
  }
  const { slug } = await context.params;
  if (!tenantSlugMatchesSession(trusted.session, slug)) {
    return Response.json(
      { error: "Tenant slug does not match session" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  const tenantId = trusted.session.tenant.id;
  const rows = await getInsightsForTenant(tenantId, {
    includeRead: true,
    limit: 40,
  });

  return Response.json({
    tenant_slug: slug,
    insights: rows.map(normalizeInsight),
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }
  const { slug } = await context.params;
  if (!tenantSlugMatchesSession(trusted.session, slug)) {
    return Response.json(
      { error: "Tenant slug does not match session" },
      { status: HTTP_STATUS.FORBIDDEN },
    );
  }

  const parsed = await parseInsightPatchBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const tenantId = trusted.session.tenant.id;

  try {
    const applied = await applyInsightPatchAction(
      parsed.action,
      parsed.insightId,
      tenantId,
    );
    if (!applied) {
      return Response.json(
        { error: "action must be read, dismiss, or action" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    return Response.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "update failed";
    const status =
      message === "Insight not found"
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.INTERNAL_ERROR;
    return Response.json({ error: message }, { status });
  }
}
