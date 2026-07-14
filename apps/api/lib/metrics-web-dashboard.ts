import { CACHE_TTL } from './constants';
import { getCache, setCache } from './redis-cache';
import { getServiceClient } from './supabase';
import { PLAN_MRR_USD } from './stripe/plans';

/** Cache key for web dashboard metrics. */
const CACHE_KEY = 'metrics:web_dashboard_json';
const CONVERSION_RATE_MULTIPLIER = 10000;
const CONVERSION_RATE_DIVISOR = 100;
const METRICS_DAYS_AGO = 30;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function calculateMrr(activePaidRes: unknown): number {
  let mrr = 0;
  const data = (activePaidRes as { data: Array<{ plan: string; is_demo: boolean }> }).data ?? [];
  for (const row of data) {
    if (row.is_demo || row.plan === 'demo' || !(row.plan in PLAN_MRR_USD)) {
      continue;
    }
    mrr += PLAN_MRR_USD[row.plan as keyof typeof PLAN_MRR_USD] ?? 0;
  }
  return mrr;
}

function validateQueryResults(results: Array<{ error?: unknown }>): void {
  const errors = results.map((r) => r.error).filter(Boolean);
  if (errors.length > 0) {
    throw new Error((errors[0] as { message?: string })?.message ?? 'Query failed');
  }
}

function buildTenantQueries(client: ReturnType<typeof getServiceClient>): unknown[] {
  return [
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true }),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended'),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('is_demo', true),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ];
}

function buildPlanQueries(client: ReturnType<typeof getServiceClient>): unknown[] {
  return [
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'startup'),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'business'),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'enterprise'),
    client
      .schema('platform')
      .from('tenants')
      .is('deleted_at', null)
      .select('plan, is_demo')
      .eq('status', 'active'),
  ];
}

function buildMetricsQueries(
  client: ReturnType<typeof getServiceClient>,
  since: string
): unknown[] {
  return [
    ...buildTenantQueries(client),
    ...buildPlanQueries(client),
    client
      .schema('platform')
      .from('conversion_events')
      .gte('created_at', since)
      .select('*', { count: 'exact', head: true })
      .eq('event', 'onboard_started'),
    client
      .schema('platform')
      .from('conversion_events')
      .gte('created_at', since)
      .select('*', { count: 'exact', head: true })
      .eq('event', 'onboard_completed'),
  ];
}

async function fetchMetricsData(
  client: ReturnType<typeof getServiceClient>,
  since: string
): Promise<unknown[]> {
  return Promise.all(buildMetricsQueries(client, since));
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

function extractTenantMetrics(
  results: Array<{ count?: number }>
): WebDashboardMetricsJson['tenants'] {
  return {
    total: results[0].count ?? 0,
    active: results[1].count ?? 0,
    suspended: results[2].count ?? 0,
    demo: results[3].count ?? 0,
    failed: results[4].count ?? 0,
  };
}

function extractPlanMetrics(results: Array<{ count?: number }>): WebDashboardMetricsJson['plans'] {
  return {
    startup: results[5].count ?? 0,
    business: results[6].count ?? 0,
    enterprise: results[7].count ?? 0,
  };
}

function calculateConversionMetrics(
  startedRes: { count?: number },
  completedRes: { count?: number }
): WebDashboardMetricsJson['conversion'] {
  const started = startedRes.count ?? 0;
  const completed = completedRes.count ?? 0;
  const rawRate = started > 0 ? (completed / started) * CONVERSION_RATE_MULTIPLIER : 0;
  const rate = Math.round(rawRate) / CONVERSION_RATE_DIVISOR;
  return { onboard_started: started, onboard_completed: completed, rate };
}

function buildDashboardMetrics(results: unknown[]): WebDashboardMetricsJson {
  const typedResults = results as Array<{ count?: number; data?: unknown[] }>;
  const mrr = calculateMrr(typedResults[8]);
  const tenants = extractTenantMetrics(typedResults);
  const plans = extractPlanMetrics(typedResults);
  const conversion = calculateConversionMetrics(typedResults[9], typedResults[10]);
  return { tenants, plans, mrr, conversion };
}

/**
 * Fetches aggregated metrics for the web dashboard, cached for 60s.
 * Reduces 11 redundant parallel Supabase queries on every request.
 */
export async function getWebDashboardMetricsJson(): Promise<WebDashboardMetricsJson> {
  const cached = await getCache<WebDashboardMetricsJson>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  const client = getServiceClient();
  const since = daysAgoIso(METRICS_DAYS_AGO);
  const results = await fetchMetricsData(client, since);
  validateQueryResults(results as Array<{ error?: unknown }>);

  const metrics = buildDashboardMetrics(results);

  // Background update (non-blocking)
  void setCache(CACHE_KEY, metrics, CACHE_TTL.SHORT).catch((err) => {
    console.warn('[metrics-web-dashboard] cache set failed', err);
  });

  return metrics;
}
