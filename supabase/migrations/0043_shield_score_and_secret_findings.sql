-- Opsly Shield — security score history + secret findings (Guardian Grid Phase 2)

CREATE TABLE IF NOT EXISTS platform.shield_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  score int CHECK (score >= 0 AND score <= 100),
  breakdown jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shield_score_history_tenant_created
  ON platform.shield_score_history (tenant_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS platform.shield_secret_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  repo_url text,
  secret_type text,
  file_path text,
  line_number int,
  severity text NOT NULL DEFAULT 'critical' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'false_positive')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shield_secret_findings_tenant_status
  ON platform.shield_secret_findings (tenant_slug, status);

CREATE INDEX IF NOT EXISTS idx_shield_secret_findings_tenant_created
  ON platform.shield_secret_findings (tenant_slug, created_at DESC);

ALTER TABLE platform.shield_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.shield_secret_findings ENABLE ROW LEVEL SECURITY;

-- Service role: API + orchestrator workers
CREATE POLICY "service_role_all_shield_score_history"
  ON platform.shield_score_history
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_shield_secret_findings"
  ON platform.shield_secret_findings
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated portal: tenant_slug from JWT user_metadata (aligns with portal session)
CREATE POLICY "authenticated_select_own_shield_score_history"
  ON platform.shield_score_history
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND tenant_slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
  );

CREATE POLICY "authenticated_select_own_shield_secret_findings"
  ON platform.shield_secret_findings
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND tenant_slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.shield_score_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.shield_secret_findings TO service_role;
GRANT USAGE ON SCHEMA platform TO authenticated;
GRANT SELECT ON platform.shield_score_history TO authenticated;
GRANT SELECT ON platform.shield_secret_findings TO authenticated;
