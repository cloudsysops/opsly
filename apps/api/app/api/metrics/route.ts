import { requireAdminToken } from "../../../lib/auth";
import { computeMrr } from "../../../lib/stripe";
import { getServiceClient } from "../../../lib/supabase";

export async function GET(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const client = getServiceClient();

  const [
    totalRes,
    activeRes,
    suspendedRes,
    startupRes,
    businessRes,
    enterpriseRes,
  ] = await Promise.all([
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

  const errors = [
    totalRes.error,
    activeRes.error,
    suspendedRes.error,
    startupRes.error,
    businessRes.error,
    enterpriseRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("metrics:", errors[0]);
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
    total_tenants: totalRes.count ?? 0,
    active_tenants: activeRes.count ?? 0,
    suspended_tenants: suspendedRes.count ?? 0,
    mrr_usd,
    tenants_by_plan: {
      startup: startupRes.count ?? 0,
      business: businessRes.count ?? 0,
      enterprise: enterpriseRes.count ?? 0,
    },
  });
}
