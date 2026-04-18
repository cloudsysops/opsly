-- OAR: memoria episódica (logs por paso) para Unified Memory / MemoryInterface.appendObservation

CREATE TABLE IF NOT EXISTS platform.agent_episode_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_slug TEXT NOT NULL,
  session_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_episode_session
  ON platform.agent_episode_logs (tenant_slug, session_id, step_index);

GRANT INSERT, SELECT ON platform.agent_episode_logs TO service_role;
