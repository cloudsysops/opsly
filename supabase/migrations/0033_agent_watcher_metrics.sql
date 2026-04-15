-- Tabla para métricas del watcher de salud
-- Schema: sandbox (para testing)
CREATE TABLE IF NOT EXISTS sandbox.agent_watcher_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL,
  tenant_slug TEXT NOT NULL,
  metrics_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watcher_metrics_run ON sandbox.agent_watcher_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_watcher_metrics_tenant ON sandbox.agent_watcher_metrics(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_watcher_metrics_created ON sandbox.agent_watcher_metrics(created_at DESC);

ALTER TABLE sandbox.agent_watcher_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role" ON sandbox.agent_watcher_metrics FOR ALL USING (true) WITH CHECK (true);