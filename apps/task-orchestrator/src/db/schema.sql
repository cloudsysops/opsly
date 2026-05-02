-- Task Orchestrator Schema for Supabase

CREATE TABLE IF NOT EXISTS opsly_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_type TEXT NOT NULL CHECK (task_type IN ('implementation', 'bugfix', 'refactor', 'research', 'documentation')),
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'executing', 'completed', 'failed', 'cancelled')),

  assigned_worker TEXT, -- cursor, ci-runner, claude-research
  worker_id TEXT, -- e.g., 'cursor-macbook-cboteros'

  created_by TEXT NOT NULL, -- e.g., 'claude'
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,

  estimated_days INT,
  git_branch TEXT,

  dependencies JSONB DEFAULT '[]'::jsonb, -- Array of task IDs
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Result fields
  result JSONB,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(prompt, ''))
  ) STORED,

  CONSTRAINT valid_status_transition CHECK (
    (status = 'pending') OR
    (status = 'assigned' AND assigned_worker IS NOT NULL) OR
    (status = 'executing' AND worker_id IS NOT NULL AND started_at IS NOT NULL) OR
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status = 'failed' AND completed_at IS NOT NULL) OR
    (status = 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS opsly_task_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES opsly_tasks(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opsly_workers (
  id TEXT PRIMARY KEY, -- e.g., 'cursor-macbook-cboteros'
  worker_type TEXT NOT NULL CHECK (worker_type IN ('cursor', 'ci-runner', 'claude-research')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'working', 'offline')),
  current_task_id UUID REFERENCES opsly_tasks(id) ON DELETE SET NULL,
  last_heartbeat TIMESTAMP DEFAULT NOW(),
  capacity INT DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_tasks_status ON opsly_tasks(status);
CREATE INDEX idx_tasks_priority ON opsly_tasks(priority);
CREATE INDEX idx_tasks_assigned_worker ON opsly_tasks(assigned_worker);
CREATE INDEX idx_tasks_created_at ON opsly_tasks(created_at DESC);
CREATE INDEX idx_tasks_search ON opsly_tasks USING GIN(search_vector);
CREATE INDEX idx_task_logs_task_id ON opsly_task_logs(task_id);
CREATE INDEX idx_workers_status ON opsly_workers(status);

-- RLS Policies (allow all for now, restrict later)
ALTER TABLE opsly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE opsly_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE opsly_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_tasks" ON opsly_tasks FOR ALL USING (true);
CREATE POLICY "allow_all_task_logs" ON opsly_task_logs FOR ALL USING (true);
CREATE POLICY "allow_all_workers" ON opsly_workers FOR ALL USING (true);
