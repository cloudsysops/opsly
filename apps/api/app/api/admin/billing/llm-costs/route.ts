import {
  aggregateLlmCostsByFeature,
  aggregateLlmCostsByModel,
  parsePeriodToUtcRange,
  type RawUsageAnalyticsRow,
} from '../../../../../lib/admin-llm-cost-analytics';
import { requireAdminAccess } from '../../../../../lib/auth';
import { CACHE_TTL, HTTP_STATUS } from '../../../../../lib/constants';
import { getCache, setCache } from '../../../../../lib/redis-cache';
import { getServiceClient } from '../../../../../lib/supabase';

export const dynamic = 'force-dynamic';

const TWO_DIGIT_PAD = 2;

function currentPeriodLabel(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(TWO_DIGIT_PAD, '0')}`;
}

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdminAccess(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenant_slug')?.trim();
  if (!tenantSlug) {
    return Response.json(
      { error: 'tenant_slug query parameter is required' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const period = url.searchParams.get('period')?.trim() ?? currentPeriodLabel();
  const range = parsePeriodToUtcRange(period);
  if (!range) {
    return Response.json({ error: 'period must be YYYY-MM' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  // Bolt Optimization: check Redis cache first for aggregated LLM costs
  const cacheKey = `admin:billing:llm-costs:${tenantSlug}:${period}`;
  const cached = await getCache<Record<string, unknown>>(cacheKey);
  if (cached !== null) return Response.json(cached);

  const db = getServiceClient();
  const { data, error } = await db
    .from('usage_events')
    .select('model, cost_usd, tokens_input, tokens_output, feature')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', range.start)
    .lt('created_at', range.end);

  if (error) {
    console.error('admin llm-costs usage_events', error);
    return Response.json(
      { error: 'Failed to load usage_events' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  const rows = (data ?? []) as RawUsageAnalyticsRow[];
  const totalCost = rows.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);

  const payload = {
    period,
    tenant_slug: tenantSlug,
    total_cost_usd: totalCost,
    total_requests: rows.length,
    by_model: aggregateLlmCostsByModel(rows),
    by_feature: aggregateLlmCostsByFeature(rows),
  };

  // Bolt Optimization: non-blocking cache write (60s TTL)
  void setCache(cacheKey, payload, CACHE_TTL.SHORT);

  return Response.json(payload);
}
