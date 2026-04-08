-- 0013_pgvector_embeddings_indexes_and_grants.sql
-- Completa índices y grants para embeddings por tenant (idempotente).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS platform.tenant_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_tenant
  ON platform.tenant_embeddings(tenant_slug);

GRANT INSERT, SELECT ON platform.tenant_embeddings TO service_role;

