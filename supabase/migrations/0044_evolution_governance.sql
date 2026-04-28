-- Evolution gap analysis and proposals
CREATE TABLE IF NOT EXISTS platform.evolution_gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  tenant_slug TEXT NOT NULL DEFAULT 'platform',
  gaps JSONB NOT NULL DEFAULT '[]'::jsonb,
  cortex_cycle_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.evolution_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id TEXT NOT NULL UNIQUE,
  gap_analysis_id UUID REFERENCES platform.evolution_gap_analyses(id),
  tenant_slug TEXT NOT NULL DEFAULT 'platform',

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_files JSONB DEFAULT '[]'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  success_criteria TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'rolled_back')),

  approval_decision_id TEXT,
  applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_proposals_status
  ON platform.evolution_proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evolution_proposals_gap
  ON platform.evolution_proposals(gap_analysis_id);

ALTER TABLE platform.evolution_gap_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.evolution_proposals ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE platform.evolution_gap_analyses TO service_role;
GRANT ALL ON TABLE platform.evolution_proposals TO service_role;

CREATE POLICY "orchestrator_gaps"
  ON platform.evolution_gap_analyses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "orchestrator_proposals"
  ON platform.evolution_proposals
  FOR ALL USING (true) WITH CHECK (true);
