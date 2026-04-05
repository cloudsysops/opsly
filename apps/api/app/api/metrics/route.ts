import { requireAdminToken } from "../../../lib/auth";
import { computeMrr } from "../../../lib/stripe";
import { getServiceClient } from "../../../lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type CountHeadResult = {
  count: number | null;
  error: { message: string; code?: string } | null;
};

type MetricRows = {
  totalRes: CountHeadResult;
  activeRes: CountHeadResult;
  suspendedRes: CountHeadResult;
  startupRes: CountHeadResult;
  businessRes: CountHeadResult;
  enterpriseRes: CountHeadResult;
};

async function fetchTenantStatusCounts(client: SupabaseClient): Promise<
  Pick<MetricRows, "totalRes" | "activeRes" | "suspendedRes">
> {
  const [totalRes, activeRes, suspendedRes] = await Promise.all([
    client
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    client
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "active"),
    client
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "suspended"),
  ]);
  return { totalRes, activeRes, suspendedRes };
}

async function fetchTenantPlanCounts(client: SupabaseClient): Promise<
  Pick<MetricRows, "startupRes" | "businessRes" | "enterpriseRes">
> {
  const [startupRes, businessRes, enterpriseRes] = await Promise.all([
    client
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("plan", "startup"),
    client
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("plan", "business"),
    client
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("plan", "enterprise"),
  ]);
  return { startupRes, businessRes, enterpriseRes };
}

async function fetchTenantMetricRows(client: SupabaseClient): Promise<MetricRows> {
  const [status, plans] = await Promise.all([
    fetchTenantStatusCounts(client),
    fetchTenantPlanCounts(client),
  ]);
  return { ...status, ...plans };
}

function firstMetricsError(rows: MetricRows): Error | null {
  type SupabaseQueryError = { message: string; code?: string };
  const errors: SupabaseQueryError[] = [
    rows.totalRes.error,
    rows.activeRes.error,
    rows.suspendedRes.error,
    rows.startupRes.error,
    rows.businessRes.error,
    rows.enterpriseRes.error,
  ].filter((e): e is SupabaseQueryError => e != null);
  if (errors.length === 0) {
    return null;
  }
  return new Error(errors[0].message);
}

export async function GET(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const client = getServiceClient();
  const rows = await fetchTenantMetricRows(client);
  const err = firstMetricsError(rows);
  if (err) {
    console.error("metrics:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  let mrr_usd = 0;
  try {
    mrr_usd = await computeMrr(client);
  } catch (e) {
    console.error("computeMrr:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  return Response.json({
    total_tenants: rows.totalRes.count ?? 0,
    active_tenants: rows.activeRes.count ?? 0,
    suspended_tenants: rows.suspendedRes.count ?? 0,
    mrr_usd,
    tenants_by_plan: {
      startup: rows.startupRes.count ?? 0,
      business: rows.businessRes.count ?? 0,
      enterprise: rows.enterpriseRes.count ?? 0,
    },
  });
}
