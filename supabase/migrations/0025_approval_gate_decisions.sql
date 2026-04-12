-- Approval Gate Phase 1: trazabilidad de decisiones Sonnet sobre métricas sandbox (sin ML/embeddings).
-- Lectura en admin vía API con SUPABASE_SERVICE_ROLE_KEY (service_role bypass RLS).

CREATE TABLE IF NOT EXISTS platform.approval_gate_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sandbox_run_id TEXT NOT NULL,
  deployment_id TEXT,
  status TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  reasoning TEXT NOT NULL,
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  metrics JSONB NOT NULL,
  model_used TEXT NOT NULL,
  complexity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_approval_gate_status CHECK (status IN ('APPROVE', 'REJECT', 'NEEDS_INFO')),
  CONSTRAINT chk_approval_gate_confidence CHECK (confidence >= 0 AND confidence <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_gate_sandbox_run_unique
  ON platform.approval_gate_decisions(sandbox_run_id);

CREATE INDEX IF NOT EXISTS idx_approval_gate_status_created
  ON platform.approval_gate_decisions(status, created_at DESC);

COMMENT ON TABLE platform.approval_gate_decisions IS 'Approval Gate Phase 1: decisiones QA (llm-gateway → orchestrator)';

ALTER TABLE platform.approval_gate_decisions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE platform.approval_gate_decisions TO service_role;
