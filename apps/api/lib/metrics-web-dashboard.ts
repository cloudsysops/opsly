import { CACHE_TTL } from './constants';
import { logger } from './logger';
import { getCache, setCache } from './redis-cache';
import { getServiceClient } from './supabase';

const CACHE_KEY = 'metrics:web_dashboard_json';

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

function buildTenantStatusQueries(client: ReturnType<typeof getServiceClient>): unknown[] {
  const q = () =>
    client
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
  return [
    q(),
    q().eq('status', 'active'),
    q().eq('status', 'suspended'),
    q().eq('is_demo', true),
    q().eq('status', 'failed'),
  ];
}

function buildPlanQueries(client: ReturnType<typeof getServiceClient>): unknown[] {
  const q = () => client.schema('platform').from('tenants').is('deleted_at', null);
  return [
    q().select('*', { count: 'exact', head: true }).eq('plan', 'startup'),
    q().select('*', { count: 'exact', head: true }).eq('plan', 'business'),
    q().select('*', { count: 'exact', head: true }).eq('plan', 'enterprise'),
    q().select('plan, is_demo').eq('status', 'active'),
  ];
}

function buildConversionQueries(
  client: ReturnType<typeof getServiceClient>,
  since: string
): unknown[] {
  const q = () =>
    client
      .schema('platform')
      .from('conversion_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);
  return [q().eq('event', 'onboard_started'), q().eq('event', 'onboard_completed')];
}

function buildMetricsQueries(
  client: ReturnType<typeof getServiceClient>,
  since: string
): unknown[] {
  return [
    ...buildTenantStatusQueries(client),
    ...buildPlanQueries(client),
    ...buildConversionQueries(client, since),
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
  const rate = started > 0 ? Math.round((completed / started) * 10000) / 100 : 0;
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
 * Agregado de métricas para el dashboard de administración.
 *
 * BOLT OPTIMIZATION:
 * 1. Utilizes existing Promise.all parallelization for 11 independent database queries.
 * 2. Implements Redis caching (60s TTL) to minimize Supabase load for frequent dashboard reloads.
 * 3. Modularizes query building to maintain low cyclomatic complexity.
 */
export async function getWebDashboardMetricsJson(): Promise<WebDashboardMetricsJson> {
  const cached = await getCache<WebDashboardMetricsJson>(CACHE_KEY);
  if (cached !== null) {
    return cached;
  }

  const client = getServiceClient();
  const since = daysAgoIso(30);
  const results = await fetchMetricsData(client, since);
  validateQueryResults(results as Array<{ error?: unknown }>);
  const metrics = buildDashboardMetrics(results);

  // Background cache set to avoid blocking the response.
  void setCache(CACHE_KEY, metrics, CACHE_TTL.SHORT).catch((err) => {
    logger.error(`[metrics-web-dashboard-cache] failed to set ${CACHE_KEY}`, err);
  });

  return metrics;
}
