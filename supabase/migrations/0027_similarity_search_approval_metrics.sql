-- Búsqueda por similitud coseno sobre embeddings de approval gate (solo service_role vía RPC).

DROP FUNCTION IF EXISTS public.search_similar_approval_metrics(vector(768), integer);

CREATE OR REPLACE FUNCTION public.search_similar_approval_metrics(
  query_embedding vector(768),
  match_limit integer DEFAULT 5
)
RETURNS TABLE (
  sandbox_run_id text,
  similarity double precision,
  status text,
  confidence integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, public
AS $$
  SELECT
    e.sandbox_run_id,
    (1 - (e.metrics_embedding <=> query_embedding))::double precision AS similarity,
    d.status,
    d.confidence
  FROM platform.approval_gate_embeddings e
  INNER JOIN platform.approval_gate_decisions d ON d.sandbox_run_id = e.sandbox_run_id
  ORDER BY e.metrics_embedding <=> query_embedding
  LIMIT match_limit;
$$;

REVOKE ALL ON FUNCTION public.search_similar_approval_metrics(vector(768), integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_similar_approval_metrics(vector(768), integer) TO service_role;
