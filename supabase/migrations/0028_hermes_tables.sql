-- Hermes: coordinación de tareas multi-agente (estado, workflows, métricas, auditoría).
-- Lectura/escritura vía service_role (API/orchestrator); RLS activo sin políticas públicas.

CREATE TABLE IF NOT EXISTS platform.hermes_state (
  task_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'unknown',
  state TEXT NOT NULL,
  assignee TEXT,
  effort TEXT NOT NULL DEFAULT 'unknown',
  agent TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  idempotency_key TEXT UNIQUE,
  request_id TEXT,
  tenant_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_hermes_state CHECK (
    state IN ('PENDING', 'ROUTED', 'EXECUTING', 'COMPLETED', 'FAILED', 'BLOCKED')
  ),
  CONSTRAINT chk_hermes_task_type CHECK (
    task_type IN ('feature', 'adr', 'infra', 'task-management', 'decision', 'unknown')
  )
);

CREATE TABLE IF NOT EXISTS platform.hermes_workflows (
  workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_hermes_wf_status CHECK (
    status IN ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED')
  )
);

CREATE TABLE IF NOT EXISTS platform.hermes_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  sprint INTEGER,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_failed INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER,
  success_rate NUMERIC(5, 4),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.hermes_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  task_id TEXT,
  agent TEXT,
  change JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hermes_state_state ON platform.hermes_state(state);
CREATE INDEX IF NOT EXISTS idx_hermes_state_agent ON platform.hermes_state(agent, state);
CREATE INDEX IF NOT EXISTS idx_hermes_metrics_sprint ON platform.hermes_metrics(sprint, agent);
CREATE INDEX IF NOT EXISTS idx_hermes_audit_task ON platform.hermes_audit(task_id);

COMMENT ON TABLE platform.hermes_state IS 'Hermes: estado de tareas coordinadas';
COMMENT ON TABLE platform.hermes_workflows IS 'Hermes: workflows multi-paso';
COMMENT ON TABLE platform.hermes_metrics IS 'Hermes: métricas por agente/sprint';
COMMENT ON TABLE platform.hermes_audit IS 'Hermes: auditoría de transiciones';

ALTER TABLE platform.hermes_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.hermes_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.hermes_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.hermes_audit ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE platform.hermes_state TO service_role;
GRANT ALL ON TABLE platform.hermes_workflows TO service_role;
GRANT ALL ON TABLE platform.hermes_metrics TO service_role;
GRANT ALL ON TABLE platform.hermes_audit TO service_role;
