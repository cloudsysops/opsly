-- Sandbox execution audit and policy tracking
CREATE TABLE IF NOT EXISTS platform.sandbox_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sandbox_run_id TEXT NOT NULL UNIQUE,
  tenant_slug TEXT NOT NULL,
  request_id TEXT,

  -- Execution configuration
  command TEXT NOT NULL,
  image TEXT NOT NULL,
  allow_network BOOLEAN NOT NULL DEFAULT FALSE,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,

  -- Results
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'completed', 'failed', 'rollback')),
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  duration_ms INTEGER,

  -- Audit trail
  policy_snapshot JSONB NOT NULL,
  approval_id UUID REFERENCES platform.approval_gate_decisions(id),
  initiated_by TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sandbox_logs_tenant
  ON platform.sandbox_execution_logs(tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_logs_status
  ON platform.sandbox_execution_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sandbox_logs_approval
  ON platform.sandbox_execution_logs(approval_id) WHERE approval_id IS NOT NULL;

ALTER TABLE platform.sandbox_execution_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE platform.sandbox_execution_logs TO service_role;

DO $$
BEGIN
  CREATE POLICY "orchestrator_all"
    ON platform.sandbox_execution_logs
    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
