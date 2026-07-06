import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getRedisClient } from './cache.js';
import { platformSchema, supabaseRpc } from './supabase-helpers.js';
import type { LLMRequest, UsageEvent } from './types.js';

let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

const USAGE_CACHE_TTL = 60; // 1 minute

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

type AggregatedUsage = {
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
  top_model: string | null;
};

export async function getTenantUsage(
  tenantSlug: string,
  period: 'today' | 'month' = 'today'
): Promise<AggregatedUsage> {
  const cacheKey = `usage:tenant:${tenantSlug}:${period}`;
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('[llm-gateway] Redis cache get failed:', e);
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

  // Bolt Optimization: Replace O(N) in-memory aggregation with efficient SQL-side RPC.
  const { data } = await supabaseRpc<AggregatedUsage>(supabase, 'get_llm_usage_stats', {
    p_tenant_slug: tenantSlug,
    p_from_date: from,
  });

  const result: AggregatedUsage = data || {
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
    requests: 0,
    cache_hits: 0,
    top_model: null,
  };

  try {
    const redis = await getRedisClient();
    await redis.setEx(cacheKey, USAGE_CACHE_TTL, JSON.stringify(result));
  } catch (e) {
    console.warn('[llm-gateway] Redis cache set failed:', e);
  }

  return result;
}

/**
 * Agrega uso LLM de todos los tenants (`usage_events`) para el período.
 */
export async function getPlatformLlmUsage(
  period: 'today' | 'month' = 'today'
): Promise<AggregatedUsage> {
  const cacheKey = `usage:platform:${period}`;
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('[llm-gateway] Redis cache get failed:', e);
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

  // Bolt Optimization: Replace O(N) in-memory aggregation with efficient SQL-side RPC.
  const { data } = await supabaseRpc<AggregatedUsage>(supabase, 'get_llm_usage_stats', {
    p_from_date: from,
  });

  const result: AggregatedUsage = data || {
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
    requests: 0,
    cache_hits: 0,
    top_model: null,
  };

  try {
    const redis = await getRedisClient();
    await redis.setEx(cacheKey, USAGE_CACHE_TTL, JSON.stringify(result));
  } catch (e) {
    console.warn('[llm-gateway] Redis cache set failed:', e);
  }

  return result;
}
