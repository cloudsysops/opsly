import { getServiceClient } from './supabase';
import { getCache, setCache } from './redis-cache';
import { CACHE_TTL } from './constants';

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
  return [
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
 * Agrega y cachea métricas globales para el dashboard web.
 * Evita 11 consultas paralelas a Supabase en cada request.
 */
export async function getWebDashboardMetricsJson(): Promise<WebDashboardMetricsJson> {
  const CACHE_KEY = 'metrics:web_dashboard_json';

  // ⚡ Bolt: Intentar recuperar del caché para evitar latencia de red y carga en DB.
  const cached = await getCache<WebDashboardMetricsJson>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  const client = getServiceClient();
  const since = daysAgoIso(30);
  const results = await fetchMetricsData(client, since);
  validateQueryResults(results as Array<{ error?: unknown }>);

  const metrics = buildDashboardMetrics(results);

  // ⚡ Bolt: Guardar en caché (TTL: 60s) de forma no bloqueante.
  void setCache(CACHE_KEY, metrics, CACHE_TTL.SHORT);

  return metrics;
}
