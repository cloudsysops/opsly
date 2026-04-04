import { adminClient } from "../../../lib/supabase/admin";
import { PLANS } from "../../../lib/stripe/plans";

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export async function GET(request: Request): Promise<Response> {
  void request;

  const since = daysAgoIso(30);

  const [
    totalRes,
    activeRes,
    suspendedRes,
    demoRes,
    failedRes,
    startupRes,
    businessRes,
    enterpriseRes,
    activePaidRes,
    startedRes,
    completedRes,
  ] = await Promise.all([
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "active"),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "suspended"),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_demo", true),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "failed"),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("plan", "startup"),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("plan", "business"),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("plan", "enterprise"),
    adminClient
      .schema("platform")
      .from("tenants")
      .select("plan, is_demo")
      .is("deleted_at", null)
      .eq("status", "active"),
    adminClient
      .schema("platform")
      .from("conversion_events")
      .select("*", { count: "exact", head: true })
      .eq("event", "onboard_started")
      .gte("created_at", since),
    adminClient
      .schema("platform")
      .from("conversion_events")
      .select("*", { count: "exact", head: true })
      .eq("event", "onboard_completed")
      .gte("created_at", since),
  ]);

  const errors = [
    totalRes.error,
    activeRes.error,
    suspendedRes.error,
    demoRes.error,
    failedRes.error,
    startupRes.error,
    businessRes.error,
    enterpriseRes.error,
    activePaidRes.error,
    startedRes.error,
    completedRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    return Response.json({ error: errors[0]?.message ?? "Query failed" }, { status: 500 });
  }

  let mrr = 0;
  for (const row of activePaidRes.data ?? []) {
    const plan = row.plan as keyof typeof PLANS;
    if (row.is_demo === true) {
      continue;
    }
    if (plan === "demo") {
      continue;
    }
    if (plan in PLANS) {
      mrr += PLANS[plan].price_usd;
    }
  }

  const onboardStarted = startedRes.count ?? 0;
  const onboardCompleted = completedRes.count ?? 0;
  const rate =
    onboardStarted > 0 ? Math.round((onboardCompleted / onboardStarted) * 10000) / 100 : 0;

  return Response.json({
    tenants: {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      suspended: suspendedRes.count ?? 0,
      demo: demoRes.count ?? 0,
      failed: failedRes.count ?? 0,
    },
    plans: {
      startup: startupRes.count ?? 0,
      business: businessRes.count ?? 0,
      enterprise: enterpriseRes.count ?? 0,
    },
    mrr,
    conversion: {
      onboard_started: onboardStarted,
      onboard_completed: onboardCompleted,
      rate,
    },
  });
}
