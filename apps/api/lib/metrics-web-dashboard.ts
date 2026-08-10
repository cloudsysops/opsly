import { getServiceClient } from './supabase';
import { CACHE_TTL } from './constants';
import { logger } from './logger';
import { getCache, setCache } from './redis-cache';

/** Named constants to satisfy the 'no-magic-numbers' ESLint rule. */
const PERCENTAGE_MULTIPLIER = 10000;
const PERCENTAGE_DIVISOR = 100;
const DEFAULT_DAYS_AGO = 30;

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

function calculateMrr(activePaidRes: unknown): number {
  let mrr = 0;
  const data = (activePaidRes as { data: Array<{ plan: string; is_demo: boolean }> }).data ?? [];
  for (const row of data) {
    if (row.is_demo || row.plan === 'demo' || !(row.plan in PLAN_MRR_USD)) {
      continue;
    }
    mrr += PLAN_MRR_USD[row.plan] ?? 0;
  }
  return mrr;
}

function validateQueryResults(results: Array<{ error?: unknown }>): void {
  const errors = results.map((r) => r.error).filter(Boolean);
  if (errors.length > 0) {
    throw new Error((errors[0] as { message?: string })?.message ?? 'Query failed');
  }
}

function buildMetricsQueries(
  client: ReturnType<typeof getServiceClient>,
  since: string
): unknown[] {
  const getBase = (): ReturnType<
    ReturnType<ReturnType<ReturnType<typeof getServiceClient>['schema']>['from']>['select']
  > => client.schema('platform').from('tenants').select('*', { count: 'exact', head: true });

  return [
    getBase().is('deleted_at', null),
    getBase().is('deleted_at', null).eq('status', 'active'),
    getBase().is('deleted_at', null).eq('status', 'suspended'),
    getBase().is('deleted_at', null).eq('is_demo', true),
    getBase().is('deleted_at', null).eq('status', 'failed'),
    getBase().is('deleted_at', null).eq('plan', 'startup'),
    getBase().is('deleted_at', null).eq('plan', 'business'),
    getBase().is('deleted_at', null).eq('plan', 'enterprise'),
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
  const rate =
    started > 0
      ? Math.round((completed / started) * PERCENTAGE_MULTIPLIER) / PERCENTAGE_DIVISOR
      : 0;
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

export async function getWebDashboardMetricsJson(): Promise<WebDashboardMetricsJson> {
  const cacheKey = 'metrics:web_dashboard_json';
  // Check Redis cache first for fast response
  const cached = await getCache<WebDashboardMetricsJson>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const client = getServiceClient();
  const since = daysAgoIso(DEFAULT_DAYS_AGO);
  const results = await fetchMetricsData(client, since);
  validateQueryResults(results as Array<{ error?: unknown }>);
  const dashboardMetrics = buildDashboardMetrics(results);

  // Background non-blocking cache write to avoid adding to response latency
  void setCache(cacheKey, dashboardMetrics, CACHE_TTL.SHORT).catch((err) => {
    logger.error(`[web-dashboard-cache] failed to set ${cacheKey}`, err);
  });

  return dashboardMetrics;
}
