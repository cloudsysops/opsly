-- Migration to add RPC for efficient LLM usage aggregation
-- Bolt Optimization: Replaces O(N) in-memory aggregation with O(1) database aggregation

CREATE OR REPLACE FUNCTION public.get_llm_usage_stats(
  p_tenant_slug text DEFAULT NULL,
  p_from_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = platform, public
STABLE
AS $$
  WITH stats AS (
    SELECT
      COALESCE(SUM(tokens_input), 0)::bigint as tokens_input,
      COALESCE(SUM(tokens_output), 0)::bigint as tokens_output,
      COALESCE(SUM(cost_usd), 0)::numeric as cost_usd,
      COUNT(*)::bigint as requests,
      COUNT(*) FILTER (WHERE cache_hit = true)::bigint as cache_hits
    FROM platform.usage_events
    WHERE (p_tenant_slug IS NULL OR tenant_slug = p_tenant_slug)
      AND (p_from_date IS NULL OR created_at >= p_from_date)
  ),
  top_model AS (
    SELECT model
    FROM platform.usage_events
    WHERE (p_tenant_slug IS NULL OR tenant_slug = p_tenant_slug)
      AND (p_from_date IS NULL OR created_at >= p_from_date)
      AND model IS NOT NULL
    GROUP BY model
    ORDER BY COUNT(*) DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'tokens_input', (SELECT tokens_input FROM stats),
    'tokens_output', (SELECT tokens_output FROM stats),
    'cost_usd', (SELECT cost_usd FROM stats),
    'requests', (SELECT requests FROM stats),
    'cache_hits', (SELECT cache_hits FROM stats),
    'top_model', (SELECT model FROM top_model)
  );
$$;

REVOKE ALL ON FUNCTION public.get_llm_usage_stats(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_llm_usage_stats(text, timestamptz) TO service_role;
