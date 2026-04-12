import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../lib/auth";
import { getServiceClient } from "../../../../lib/supabase/client";

export const dynamic = "force-dynamic";

const LIMIT_STATE_ROWS = 10_000;
const LIMIT_METRICS_ROWS = 50;
const LIMIT_WORKFLOW_ROWS = 20;
const LIMIT_AUDIT_ROWS = 20;

function countTasksByState(rows: { state: string }[]): Record<string, number> {
  const byState: Record<string, number> = {};
  for (const row of rows) {
    const s = row.state;
    byState[s] = (byState[s] ?? 0) + 1;
  }
  return byState;
}

type SupabaseTableResult = {
  data: unknown;
  error: { message: string } | null;
};

async function loadHermesAggregates(): Promise<
  [SupabaseTableResult, SupabaseTableResult, SupabaseTableResult, SupabaseTableResult]
> {
  const sb = getServiceClient().schema("platform");
  return Promise.all([
    sb.from("hermes_state").select("state").limit(LIMIT_STATE_ROWS),
    sb.from("hermes_metrics").select("*").order("captured_at", { ascending: false }).limit(LIMIT_METRICS_ROWS),
    sb.from("hermes_workflows").select("workflow_id, name, status, updated_at").limit(LIMIT_WORKFLOW_ROWS),
    sb.from("hermes_audit").select("*").order("timestamp", { ascending: false }).limit(LIMIT_AUDIT_ROWS),
  ]);
}

/**
 * GET /api/hermes/metrics — agregados Hermes (tablas `platform.hermes_*`).
 * Requiere sesión admin o token de plataforma (mismo patrón que `/api/metrics/teams`).
 */
export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const [stateRes, metricsRes, wfRes, auditRes] = await loadHermesAggregates();

  const byState = countTasksByState((stateRes.data ?? []) as { state: string }[]);

  return NextResponse.json({
    ok: true,
    tasks_by_state: byState,
    metrics: metricsRes.data ?? [],
    workflows: wfRes.data ?? [],
    audit_recent: auditRes.data ?? [],
    errors: {
      state: stateRes.error?.message,
      metrics: metricsRes.error?.message,
      workflows: wfRes.error?.message,
      audit: auditRes.error?.message,
    },
  });
}
