import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { platformSchema } from './supabase-helpers.js';
import type { LLMRequest, UsageEvent } from './types.js';
import { getRedisClient } from './cache.js';

const USAGE_CACHE_TTL = 60;

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

function getSupabaseClient(): ReturnType<typeof createSupabaseClient> | null {
  if (supabaseClient) {
    return supabaseClient;
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  supabaseClient = createSupabaseClient(supabaseUrl, serviceRoleKey);
  return supabaseClient;
}

type UsageRow = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  cache_hit: boolean;
  model: string;
};

/** Combina fila de uso con atribución opcional del request (billing / analytics). */
export function mergeUsageAttribution(req: LLMRequest, base: UsageEvent): UsageEvent {
  const meta =
    req.usage_metadata !== undefined && Object.keys(req.usage_metadata).length > 0
      ? req.usage_metadata
      : undefined;
  return {
    ...base,
    ...(req.user_id !== undefined && req.user_id.length > 0 ? { user_id: req.user_id } : {}),
    ...(req.feature !== undefined && req.feature.length > 0 ? { feature: req.feature } : {}),
    ...(meta !== undefined ? { metadata: meta } : {}),
  };
}

export async function logUsage(event: UsageEvent): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }
    await platformSchema(supabase).from('usage_events').insert(event);
  } catch (error) {
    console.error('[llm-gateway] Error logging usage:', error);
  }
}

/**
 * Retrieves LLM usage metrics for a specific tenant, aggregated by period.
 *
 * Performance Optimization (Bolt):
 * Results are cached in Redis for 60 seconds to avoid repeated O(N) database aggregations
 * during frequent dashboard requests or budget checks. This significantly reduces
 * Supabase query load and latency.
 */
export async function getTenantUsage(
  tenantSlug: string,
  period: 'today' | 'month' = 'today'
): Promise<{
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
  top_model: string | null;
}> {
  const cacheKey = `usage:tenant:${tenantSlug}:${period}`;
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (e) {
    console.error('[llm-gateway] Redis get error in getTenantUsage:', e);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      requests: 0,
      cache_hits: 0,
      top_model: null,
    };
  }
  const now = new Date();
  const from =
    period === 'today'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await platformSchema(supabase)
    .from('usage_events')
    .select('tokens_input,tokens_output,cost_usd,cache_hit,model')
    .eq('tenant_slug', tenantSlug)
    .gte('created_at', from);

  const rows: UsageRow[] = (data || []) as UsageRow[];

  // Compute the most-used model
  const modelCount = new Map<string, number>();
  for (const row of rows) {
    if (row.model) {
      modelCount.set(row.model, (modelCount.get(row.model) ?? 0) + 1);
    }
  }
  let top_model: string | null = null;
  let topCount = 0;
  for (const [model, count] of modelCount) {
    if (count > topCount) {
      top_model = model;
      topCount = count;
    }
  }

  const result = {
    tokens_input: rows.reduce((sum, row) => sum + row.tokens_input, 0),
    tokens_output: rows.reduce((sum, row) => sum + row.tokens_output, 0),
    cost_usd: rows.reduce((sum, row) => sum + row.cost_usd, 0),
    requests: rows.length,
    cache_hits: rows.filter((row) => row.cache_hit).length,
    top_model,
  };

  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.setEx(cacheKey, USAGE_CACHE_TTL, JSON.stringify(result));
    }
  } catch (e) {
    console.error('[llm-gateway] Redis set error in getTenantUsage:', e);
  }

  return result;
}

/**
 * Aggregates LLM usage for all tenants for a given period.
 *
 * Performance Optimization (Bolt):
 * Uses a 60s Redis cache to prevent expensive global aggregations on every request.
 * Expected impact: Reduces database IO and provides ~10x faster response for cached results.
 */
export async function getPlatformLlmUsage(period: 'today' | 'month' = 'today'): Promise<{
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
  top_model: string | null;
}> {
  const cacheKey = `usage:platform:${period}`;
  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (e) {
    console.error('[llm-gateway] Redis get error in getPlatformLlmUsage:', e);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      tokens_input: 0,
      tokens_output: 0,
      cost_usd: 0,
      requests: 0,
      cache_hits: 0,
      top_model: null,
    };
  }
  const now = new Date();
  const from =
    period === 'today'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await platformSchema(supabase)
    .from('usage_events')
    .select('tokens_input,tokens_output,cost_usd,cache_hit,model')
    .gte('created_at', from);

  const rows: UsageRow[] = (data || []) as UsageRow[];

  const modelCount = new Map<string, number>();
  for (const row of rows) {
    if (row.model) {
      modelCount.set(row.model, (modelCount.get(row.model) ?? 0) + 1);
    }
  }
  let top_model: string | null = null;
  let topCount = 0;
  for (const [model, count] of modelCount) {
    if (count > topCount) {
      top_model = model;
      topCount = count;
    }
  }

  const result = {
    tokens_input: rows.reduce((sum, row) => sum + row.tokens_input, 0),
    tokens_output: rows.reduce((sum, row) => sum + row.tokens_output, 0),
    cost_usd: rows.reduce((sum, row) => sum + row.cost_usd, 0),
    requests: rows.length,
    cache_hits: rows.filter((row) => row.cache_hit).length,
    top_model,
  };

  try {
    const redis = await getRedisClient();
    if (redis) {
      await redis.setEx(cacheKey, USAGE_CACHE_TTL, JSON.stringify(result));
    }
  } catch (e) {
    console.error('[llm-gateway] Redis set error in getPlatformLlmUsage:', e);
  }

  return result;
}
