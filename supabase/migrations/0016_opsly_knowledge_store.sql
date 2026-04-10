-- Memoria global Opsly Brain (orchestrator RAG / pgvector)
-- Conexión recomendada: DATABASE_URL con rol que pueda CREATE en public (p. ej. service role en sesiones de migración).
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.opsly_knowledge_store (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opsly_knowledge_store_embedding
  ON public.opsly_knowledge_store
  USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE public.opsly_knowledge_store IS 'RAG Opsly Brain; embeddings text-embedding-3-small (1536)';
