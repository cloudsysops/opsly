import { getServiceClient } from './supabase';

/** Alineado a `apps/web/lib/stripe/plans` price_usd (MRR orientativo). */
const PLAN_MRR_USD: Record<string, number> = {
  startup: 49,
  business: 149,
  enterprise: 499,
  demo: 0,
};

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export type WebDashboardMetricsJson = {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    demo: number;
    failed: number;
  };
  plans: { startup: number; business: number; enterprise: number };
  mrr: number;
  conversion: { onboard_started: number; onboard_completed: number; rate: number };
};

export async function getWebDashboardMetricsJson(): Promise<WebDashboardMetricsJson> {
  const client = getServiceClient();
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
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'active'),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'suspended'),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('is_demo', true),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('status', 'failed'),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('plan', 'startup'),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('plan', 'business'),
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .eq('plan', 'enterprise'),
    client
      .schema('platform')
      .from('tenants')
      .select('plan, is_demo')
      .is('deleted_at', null)
      .eq('status', 'active'),
    client
      .schema('platform')
      .from('conversion_events')
      .select('*', { count: 'exact', head: true })
      .eq('event', 'onboard_started')
      .gte('created_at', since),
    client
      .schema('platform')
      .from('conversion_events')
      .select('*', { count: 'exact', head: true })
      .eq('event', 'onboard_completed')
      .gte('created_at', since),
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
    throw new Error(errors[0]?.message ?? 'Query failed');
  }

  let mrr = 0;
  for (const row of activePaidRes.data ?? []) {
    const plan = row.plan as string;
    if (row.is_demo === true) {
      continue;
    }
    if (plan === 'demo') {
      continue;
    }
    if (plan in PLAN_MRR_USD) {
      mrr += PLAN_MRR_USD[plan] ?? 0;
    }
  }

  const onboardStarted = startedRes.count ?? 0;
  const onboardCompleted = completedRes.count ?? 0;
  const rate =
    onboardStarted > 0 ? Math.round((onboardCompleted / onboardStarted) * 10000) / 100 : 0;

  return {
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
  };
}
