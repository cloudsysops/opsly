import { NextRequest } from "next/server";
import { z } from "zod";
import { HTTP_STATUS } from "../../../../../../lib/constants";
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from "../../../../../../lib/portal-trusted-identity";
import { getServiceClient } from "../../../../../../lib/supabase";
import { logger } from "../../../../../../lib/logger";

interface BudgetRow {
  monthly_cap_usd: number;
  alert_threshold_pct: number;
}

const DEFAULT_ALERT_THRESHOLD_PCT = 80;

const budgetBodySchema = z.object({
  monthly_cap_usd: z.number().positive(),
  alert_threshold_pct: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(DEFAULT_ALERT_THRESHOLD_PCT),
});

async function fetchBudget(slug: string): Promise<BudgetRow | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema("platform")
    .from("tenant_budgets")
    .select("monthly_cap_usd, alert_threshold_pct")
    .eq("tenant_slug", slug)
    .maybeSingle();

  if (error) {
    logger.error("budget fetchBudget", error);
    return null;
  }
  return data as BudgetRow | null;
}

async function upsertBudget(slug: string, row: BudgetRow): Promise<boolean> {
  const db = getServiceClient();
  const { error } = await db
    .schema("platform")
    .from("tenant_budgets")
    .upsert(
      {
        tenant_slug: slug,
        monthly_cap_usd: row.monthly_cap_usd,
        alert_threshold_pct: row.alert_threshold_pct,
      },
      { onConflict: "tenant_slug" },
    );

  if (error) {
    logger.error("budget upsertBudget", error);
    return false;
  }
  return true;
}

function buildGuardResponse(
  request: NextRequest,
  slug: string,
): Promise<
  | { ok: false; response: Response }
  | {
      ok: true;
      response: null;
    }
> {
  return resolveTrustedPortalSession(request).then((trusted) => {
    if (!trusted.ok) {
      return { ok: false, response: trusted.response };
    }
    if (!tenantSlugMatchesSession(trusted.session, slug)) {
      return {
        ok: false,
        response: Response.json(
          { error: "Tenant slug does not match session" },
          { status: HTTP_STATUS.FORBIDDEN },
        ),
      };
    }
    return { ok: true, response: null };
  });
}

/**
 * GET /api/portal/tenant/[slug]/budget
 *
 * Devuelve el presupuesto mensual personalizado del tenant (si existe).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const guard = await buildGuardResponse(request, slug);
  if (!guard.ok) {
    return guard.response as Response;
  }

  const budget = await fetchBudget(slug);
  return Response.json({
    slug,
    monthly_cap_usd: budget?.monthly_cap_usd ?? null,
    alert_threshold_pct:
      budget?.alert_threshold_pct ?? DEFAULT_ALERT_THRESHOLD_PCT,
  });
}

/**
 * PUT /api/portal/tenant/[slug]/budget
 *
 * Establece un límite mensual personalizado en USD para el consumo de IA.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const guard = await buildGuardResponse(request, slug);
  if (!guard.ok) {
    return guard.response as Response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const parsed = budgetBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const saved = await upsertBudget(slug, {
    monthly_cap_usd: parsed.data.monthly_cap_usd,
    alert_threshold_pct: parsed.data.alert_threshold_pct,
  });

  if (!saved) {
    return Response.json(
      { error: "Failed to save budget" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  return Response.json({ ok: true, slug, ...parsed.data });
}
