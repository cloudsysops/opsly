-- Validation Metrics: Track validation outcomes for adaptive agent selection
-- Enables ValidationOrchestrator ↔ OpenClaw feedback loop

CREATE TABLE validation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL,
  intent TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('commit', 'iterate', 'escalate')),
  iteration_count INT DEFAULT 1,
  validation_time_ms INT DEFAULT 0,
  failed_checks TEXT[] DEFAULT '{}',
  model_tier TEXT DEFAULT 'balanced' CHECK (model_tier IN ('economy', 'balanced', 'premium')),
  cost_usd DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_validation_metrics_intent_action
  ON validation_metrics(intent, action);

CREATE INDEX idx_validation_metrics_agent_role
  ON validation_metrics(agent_role);

CREATE INDEX idx_validation_metrics_intent
  ON validation_metrics(intent);

CREATE INDEX idx_validation_metrics_created_at
  ON validation_metrics(created_at DESC);

CREATE INDEX idx_validation_metrics_job_id
  ON validation_metrics(job_id);

-- View for agent performance statistics
CREATE VIEW validation_agent_performance AS
SELECT
  agent_role,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE action = 'commit') as commit_count,
  COUNT(*) FILTER (WHERE action = 'iterate') as iterate_count,
  COUNT(*) FILTER (WHERE action = 'escalate') as escalate_count,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'commit')::DECIMAL /
    COUNT(*)::DECIMAL,
    3
  ) as commit_rate,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'iterate')::DECIMAL /
    COUNT(*)::DECIMAL,
    3
  ) as iterate_rate,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'escalate')::DECIMAL /
    COUNT(*)::DECIMAL,
    3
  ) as escalate_rate,
  ROUND(AVG(iteration_count)::NUMERIC, 2) as avg_iterations,
  ROUND(AVG(validation_time_ms)::NUMERIC, 0) as avg_validation_time_ms
FROM validation_metrics
GROUP BY agent_role;

-- View for intent validation history
CREATE VIEW validation_intent_history AS
SELECT
  intent,
  COUNT(*) as total_validations,
  COUNT(*) FILTER (WHERE action = 'commit') as commit_count,
  COUNT(*) FILTER (WHERE action = 'iterate') as iterate_count,
  COUNT(*) FILTER (WHERE action = 'escalate') as escalate_count,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'commit')::DECIMAL /
    COUNT(*)::DECIMAL,
    3
  ) as success_rate,
  MAX(created_at) as last_validation_at
FROM validation_metrics
GROUP BY intent;

-- Comment for documentation
COMMENT ON TABLE validation_metrics IS 'Tracks validation outcomes to enable feedback loop for adaptive agent selection in OpenClaw';
COMMENT ON COLUMN validation_metrics.job_id IS 'Unique identifier for validation job';
COMMENT ON COLUMN validation_metrics.intent IS 'Intent being validated';
COMMENT ON COLUMN validation_metrics.agent_role IS 'Agent role (executor, validator, etc)';
COMMENT ON COLUMN validation_metrics.action IS 'Validation decision: commit (success), iterate (retry), escalate (human review)';
COMMENT ON COLUMN validation_metrics.iteration_count IS 'Number of iterations to reach decision (1 = first attempt)';
COMMENT ON COLUMN validation_metrics.validation_time_ms IS 'Total validation duration in milliseconds';
COMMENT ON COLUMN validation_metrics.failed_checks IS 'Array of failed validation checks (type-check, test, build)';
COMMENT ON COLUMN validation_metrics.model_tier IS 'Model tier used (economy, balanced, premium)';
COMMENT ON COLUMN validation_metrics.cost_usd IS 'Estimated cost in USD';
