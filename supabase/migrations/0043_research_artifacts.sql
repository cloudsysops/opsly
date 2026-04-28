-- Research artifacts with audit trail
CREATE TABLE IF NOT EXISTS platform.research_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_run_id TEXT NOT NULL UNIQUE,
  tenant_slug TEXT NOT NULL,
  request_id TEXT,

  -- Query parameters
  query TEXT NOT NULL,
  depth TEXT NOT NULL DEFAULT 'standard' CHECK (depth IN ('fast', 'standard', 'deep')),
  topic_context TEXT,

  -- Results
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  synthesis TEXT,
  answer TEXT,

  -- Metrics
  source_count INTEGER NOT NULL DEFAULT 0,
  avg_relevance_score FLOAT,
  duration_ms INTEGER,

  -- Audit trail
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('started', 'completed', 'failed')),
  error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_research_artifacts_tenant
  ON platform.research_artifacts(tenant_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_research_artifacts_query
  ON platform.research_artifacts(query, created_at DESC);

ALTER TABLE platform.research_artifacts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE platform.research_artifacts TO service_role;

CREATE POLICY "orchestrator_all"
  ON platform.research_artifacts
  FOR ALL USING (true) WITH CHECK (true);
