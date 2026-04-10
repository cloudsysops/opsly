import { tryRoute } from "../../../../lib/api-response";
import { getBullmqPipelineJobTotals } from "../../../../lib/bullmq-pipeline-counts";
import { HTTP_STATUS } from "../../../../lib/constants";
import { resolveSuperAdminSession } from "../../../../lib/super-admin-auth";
import { getServiceClient } from "../../../../lib/supabase";

function monthStartUtcIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

function asMetricsRow(
  raw: unknown,
): { active_tenants: number; gross_revenue_month: number } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const at = o.active_tenants;
  const gr = o.gross_revenue_month;
  return {
    active_tenants: typeof at === "number" ? at : Number(at),
    gross_revenue_month:
      typeof gr === "number" ? gr : Number(gr),
  };
}

async function fetchAdminMetrics(): Promise<Response> {
  const db = getServiceClient();
  const { data: sqlMetrics, error: sqlErr } = await db.rpc("opsly_admin_metrics", {
    p_month_start: monthStartUtcIso(),
  });
  if (sqlErr) {
    console.error("opsly_admin_metrics", sqlErr);
    return Response.json(
      { error: "Metrics query failed" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }

  const parsed = asMetricsRow(sqlMetrics);
  const { data: revenueSeries, error: revErr } = await db.rpc(
    "opsly_admin_revenue_by_month",
    { p_months: 6 },
  );
  if (revErr) {
    console.error("opsly_admin_revenue_by_month", revErr);
  }

  const bull = await getBullmqPipelineJobTotals();

  return Response.json({
    active_tenants: parsed?.active_tenants ?? 0,
    gross_revenue_month_usd: parsed?.gross_revenue_month ?? 0,
    revenue_last_months: revenueSeries ?? [],
    bullmq_pipeline_jobs: bull?.all_queues_total ?? 0,
    bullmq: {
      ...bull,
      redis_available: bull !== null,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  return tryRoute("GET /api/admin/metrics", async () => {
    const auth = await resolveSuperAdminSession(request);
    if (!auth.ok) {
      return auth.response;
    }
    return fetchAdminMetrics();
  });
}
