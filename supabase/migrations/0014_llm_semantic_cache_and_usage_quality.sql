-- Semantic cache (pgvector) + quality_score en usage_events + RPCs para PostgREST

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE platform.usage_events
  ADD COLUMN IF NOT EXISTS quality_score double precision;

CREATE TABLE IF NOT EXISTS platform.llm_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  prompt_hash text NOT NULL,
  prompt_embedding vector(1536),
  prompt_text text NOT NULL,
  response text NOT NULL,
  model_used text,
  quality_score double precision,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, prompt_hash)
);

CREATE INDEX IF NOT EXISTS idx_llm_cache_tenant
  ON platform.llm_cache (tenant_slug);

CREATE INDEX IF NOT EXISTS idx_llm_cache_embedding
  ON platform.llm_cache
  USING ivfflat (prompt_embedding vector_cosine_ops)
  WITH (lists = 100);

GRANT INSERT, SELECT, UPDATE, DELETE ON platform.llm_cache TO service_role;

-- PostgREST: RPC en public (SECURITY DEFINER → platform)
CREATE OR REPLACE FUNCTION public.match_cached_responses(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_slug text
)
RETURNS TABLE (
  id uuid,
  response text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, public
AS $$
  SELECT c.id, c.response,
    (1 - (c.prompt_embedding <=> query_embedding))::float AS similarity
  FROM platform.llm_cache c
  WHERE c.tenant_slug = p_tenant_slug
    AND c.prompt_embedding IS NOT NULL
    AND (1 - (c.prompt_embedding <=> query_embedding)) > match_threshold
  ORDER BY c.prompt_embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_tenant_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_slug text
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = platform, public
AS $$
  SELECT e.id, e.content,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM platform.tenant_embeddings e
  WHERE e.tenant_slug = p_tenant_slug
    AND e.embedding IS NOT NULL
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_cached_responses(vector, float, int, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_tenant_embeddings(vector, float, int, text) TO service_role;
