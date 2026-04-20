/* eslint-disable no-magic-numbers */
import { tryRoute } from '../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { resolveSuperAdminSession } from '../../../../../lib/super-admin-auth';
import { getServiceClient } from '../../../../../lib/supabase';

const DAYS_BACK = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

interface OllamaMetric {
  tenant_slug: string;
  total_requests: number;
  total_tokens_input: number;
  total_tokens_output: number;
  cache_hits: number;
  avg_latency_ms: number;
  success_rate: number;
  models_used: string[];
}

interface OllamaTotalMetrics {
  total_requests: number;
  total_tokens: number;
  total_cache_hits: number;
  avg_latency_ms: number;
  success_rate: number;
  by_tenant: OllamaMetric[];
}

interface UsageEvent {
  tenant_slug: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  metadata: Record<string, unknown> | null;
}

interface AggregateStats {
  totalRequests: number;
  totalTokens: number;
  totalCacheHits: number;
  totalLatency: number;
  successCount: number;
}

function extractEventMetrics(event: UsageEvent): {
  latencyMs: number;
  isCacheHit: number;
  isSuccess: number;
  model: string;
} {
  const metadata = event.metadata as Record<string, unknown> | null;
  const latencyMs = typeof metadata?.latency_ms === 'number' ? metadata.latency_ms : 0;
  const isCacheHit = metadata?.cache_hit === true ? 1 : 0;
  const isSuccess = (metadata?.error as string | undefined) ? 0 : 1;
  const model = typeof metadata?.model_used === 'string' ? metadata.model_used : 'unknown';

  return { latencyMs, isCacheHit, isSuccess, model };
}

// eslint-disable-next-line complexity, max-lines-per-function
async function fetchOllamaMetrics(): Promise<Response> {
  const db = getServiceClient();

  const thirtyDaysAgo = new Date(Date.now() - DAYS_BACK * MILLISECONDS_PER_DAY).toISOString();

  const { data: events, error: eventsErr } = (await db
    .from('usage_events')
    .select('tenant_slug, tokens_input, tokens_output, cost_usd, metadata')
    .eq('model', 'llama_local')
    .gte('created_at', thirtyDaysAgo)) as {
    data: UsageEvent[] | null;
    error: { message: string } | null;
  };

  if (eventsErr) {
    console.error('usage_events query error:', eventsErr);
    return Response.json(
      { error: 'Failed to fetch metrics' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  if (!events || events.length === 0) {
    return Response.json({
      total_requests: 0,
      total_tokens: 0,
      total_cache_hits: 0,
      avg_latency_ms: 0,
      success_rate: 1.0,
      by_tenant: [],
    });
  }

  const byTenant = new Map<string, OllamaMetric>();
  const stats: AggregateStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCacheHits: 0,
    totalLatency: 0,
    successCount: 0,
  };

  for (const event of events) {
    const tenantSlug = event.tenant_slug || 'unknown';
    const { latencyMs, isCacheHit, isSuccess, model } = extractEventMetrics(event);

    stats.totalRequests++;
    stats.totalTokens += (event.tokens_input || 0) + (event.tokens_output || 0);
    stats.totalCacheHits += isCacheHit;
    stats.totalLatency += latencyMs;
    stats.successCount += isSuccess;

    if (!byTenant.has(tenantSlug)) {
      byTenant.set(tenantSlug, {
        tenant_slug: tenantSlug,
        total_requests: 0,
        total_tokens_input: 0,
        total_tokens_output: 0,
        cache_hits: 0,
        avg_latency_ms: 0,
        success_rate: 0,
        models_used: [],
      });
    }

    const tenant = byTenant.get(tenantSlug)!;
    tenant.total_requests++;
    tenant.total_tokens_input += event.tokens_input || 0;
    tenant.total_tokens_output += event.tokens_output || 0;
    tenant.cache_hits += isCacheHit;
    if (!tenant.models_used.includes(model)) {
      tenant.models_used.push(model);
    }
  }

  for (const tenant of byTenant.values()) {
    tenant.avg_latency_ms =
      tenant.total_requests > 0 ? stats.totalLatency / tenant.total_requests : 0;
    tenant.success_rate =
      tenant.total_requests > 0 ? stats.successCount / tenant.total_requests : 1.0;
  }

  const result: OllamaTotalMetrics = {
    total_requests: stats.totalRequests,
    total_tokens: stats.totalTokens,
    total_cache_hits: stats.totalCacheHits,
    avg_latency_ms: stats.totalRequests > 0 ? stats.totalLatency / stats.totalRequests : 0,
    success_rate: stats.totalRequests > 0 ? stats.successCount / stats.totalRequests : 1.0,
    by_tenant: Array.from(byTenant.values()).sort((a, b) => b.total_requests - a.total_requests),
  };

  return Response.json(result);
}

export async function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/admin/metrics/ollama', async () => {
    const auth = await resolveSuperAdminSession(request);
    if (!auth.ok) {
      return auth.response;
    }
    return fetchOllamaMetrics();
  });
}
