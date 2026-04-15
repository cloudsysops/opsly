-- Tabla para resultados de tareas de agentes Lanidea
-- Schema: sandbox (para testing)
CREATE TABLE IF NOT EXISTS sandbox.agent_task_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona TEXT NOT NULL,
  run_id TEXT NOT NULL,
  tenant_slug TEXT NOT NULL,
  result_summary TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_agent_task_results_run_id ON sandbox.agent_task_results(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_task_results_tenant ON sandbox.agent_task_results(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_agent_task_results_persona ON sandbox.agent_task_results(persona);

-- Policy RLS
ALTER TABLE sandbox.agent_task_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role" ON sandbox.agent_task_results
  FOR ALL USING (true) WITH CHECK (true);