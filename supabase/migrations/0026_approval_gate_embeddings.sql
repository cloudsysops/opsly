-- Approval Gate: embeddings Vertex (text-embedding-004 → 768 dims) + pgvector.

CREATE TABLE IF NOT EXISTS platform.approval_gate_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sandbox_run_id TEXT NOT NULL,
  metrics_embedding vector(768) NOT NULL,
  metrics_text TEXT,
  model_used TEXT NOT NULL DEFAULT 'text-embedding-004',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_approval_gate_embeddings_run
    FOREIGN KEY (sandbox_run_id)
    REFERENCES platform.approval_gate_decisions (sandbox_run_id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_gate_embeddings_sandbox_unique
  ON platform.approval_gate_embeddings (sandbox_run_id);

CREATE INDEX IF NOT EXISTS idx_approval_embeddings_hnsw
  ON platform.approval_gate_embeddings
  USING hnsw (metrics_embedding vector_cosine_ops);

COMMENT ON TABLE platform.approval_gate_embeddings IS 'Approval Gate: embeddings de métricas (Vertex text-embedding-004)';

ALTER TABLE platform.approval_gate_embeddings ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE platform.approval_gate_embeddings TO service_role;
