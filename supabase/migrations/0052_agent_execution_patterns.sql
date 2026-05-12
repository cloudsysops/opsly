-- Agent Execution Patterns: Track execution outcomes for autonomous iteration
-- Enables AgentTrainer + IterationOrchestrator to learn from past executions

CREATE TABLE agent_execution_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_role TEXT NOT NULL,
  intent TEXT NOT NULL,
  prompt_pattern TEXT,
  success_rate FLOAT DEFAULT 0.0,
  avg_iterations INT DEFAULT 1,
  total_executions INT DEFAULT 0,
  common_errors TEXT[] DEFAULT '{}',
  typical_sequence TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for efficient pattern lookup
CREATE INDEX idx_agent_role_intent ON agent_execution_patterns(agent_role, intent);
CREATE INDEX idx_agent_role ON agent_execution_patterns(agent_role);
CREATE INDEX idx_intent ON agent_execution_patterns(intent);
CREATE INDEX idx_last_updated ON agent_execution_patterns(last_updated DESC);

-- View for quick pattern statistics by agent role
CREATE VIEW agent_pattern_statistics AS
SELECT
  agent_role,
  COUNT(*) as total_patterns,
  ROUND(AVG(success_rate)::NUMERIC, 3) as avg_success_rate,
  ROUND(AVG(avg_iterations)::NUMERIC, 2) as avg_iterations_per_pattern,
  MAX(last_updated) as most_recent_update
FROM agent_execution_patterns
GROUP BY agent_role;

-- Comment for documentation
COMMENT ON TABLE agent_execution_patterns IS 'Tracks execution patterns to enable autonomous iteration learning and prompt optimization';
COMMENT ON COLUMN agent_execution_patterns.agent_role IS 'Agent role (executor, validator, etc)';
COMMENT ON COLUMN agent_execution_patterns.intent IS 'Intent being executed';
COMMENT ON COLUMN agent_execution_patterns.prompt_pattern IS 'Hash or pattern of effective prompts';
COMMENT ON COLUMN agent_execution_patterns.success_rate IS 'Fraction of executions resulting in commit (0.0-1.0)';
COMMENT ON COLUMN agent_execution_patterns.avg_iterations IS 'Average number of iterations needed';
COMMENT ON COLUMN agent_execution_patterns.total_executions IS 'Number of times pattern has been observed';
COMMENT ON COLUMN agent_execution_patterns.common_errors IS 'Array of errors commonly seen with this pattern';
COMMENT ON COLUMN agent_execution_patterns.typical_sequence IS 'Array of typical action sequences (e.g., [type-check, test, build])';
