CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS platform.tenant_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug text NOT NULL,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);