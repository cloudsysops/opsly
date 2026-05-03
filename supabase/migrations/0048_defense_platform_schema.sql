-- Defense Platform — audits, vulnerabilities, compliance, events, pentest summaries.
-- Consumo principal: API Next (service_role). Portal: SELECT vía RLS + tenant_slug en JWT.

CREATE SCHEMA IF NOT EXISTS defense;

CREATE OR REPLACE FUNCTION defense.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS defense.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  audit_type text NOT NULL CHECK (
    audit_type IN ('security', 'compliance', 'pentest', 'code_review')
  ),
  framework text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'failed')
  ),
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  scope text,
  severity_level int CHECK (severity_level IS NULL OR (severity_level >= 1 AND severity_level <= 5)),
  findings jsonb,
  total_findings int NOT NULL DEFAULT 0,
  critical_count int NOT NULL DEFAULT 0,
  high_count int NOT NULL DEFAULT 0,
  report_url text,
  pdf_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defense.vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES defense.audits (id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cvss_score numeric(3, 1),
  severity text CHECK (
    severity IS NULL OR severity IN ('critical', 'high', 'medium', 'low', 'info')
  ),
  affected_component text,
  cve_id text,
  cwe_id text,
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'fixed', 'accepted', 'deferred')
  ),
  remediation text,
  remediation_deadline date,
  evidence text,
  poc_url text,
  assigned_to uuid REFERENCES auth.users (id),
  priority int CHECK (priority IS NULL OR (priority >= 1 AND priority <= 5)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  fixed_at timestamptz
);

CREATE TABLE IF NOT EXISTS defense.compliance_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  framework text NOT NULL,
  requirement_id text,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_assessed' CHECK (
    status IN ('not_assessed', 'compliant', 'partial', 'non_compliant')
  ),
  evidence text,
  last_verified timestamptz,
  implementation_date date,
  deadline date,
  responsible_user uuid REFERENCES auth.users (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defense.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  description text,
  actor_user_id uuid REFERENCES auth.users (id),
  actor_ip text,
  affected_resource text,
  status text NOT NULL DEFAULT 'logged' CHECK (
    status IN ('logged', 'investigating', 'resolved', 'dismissed')
  ),
  investigation_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS defense.pentest_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES defense.audits (id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  test_date timestamptz,
  tester_name text,
  scope text,
  vulnerabilities_found int,
  vulnerabilities_exploitable int,
  methodology text,
  report_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_defense_audits_tenant_status ON defense.audits (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_defense_vulns_tenant_severity ON defense.vulnerabilities (tenant_id, severity);
CREATE INDEX IF NOT EXISTS idx_defense_compliance_tenant_framework
  ON defense.compliance_requirements (tenant_id, framework);
CREATE INDEX IF NOT EXISTS idx_defense_security_events_tenant_time
  ON defense.security_events (tenant_id, created_at DESC);

DROP TRIGGER IF EXISTS defense_audits_updated_at ON defense.audits;
CREATE TRIGGER defense_audits_updated_at
  BEFORE UPDATE ON defense.audits
  FOR EACH ROW EXECUTE FUNCTION defense.set_updated_at();

DROP TRIGGER IF EXISTS defense_vulnerabilities_updated_at ON defense.vulnerabilities;
CREATE TRIGGER defense_vulnerabilities_updated_at
  BEFORE UPDATE ON defense.vulnerabilities
  FOR EACH ROW EXECUTE FUNCTION defense.set_updated_at();

DROP TRIGGER IF EXISTS defense_compliance_requirements_updated_at ON defense.compliance_requirements;
CREATE TRIGGER defense_compliance_requirements_updated_at
  BEFORE UPDATE ON defense.compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION defense.set_updated_at();

ALTER TABLE defense.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense.vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense.pentest_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY defense_audits_service_role_all
  ON defense.audits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY defense_vulnerabilities_service_role_all
  ON defense.vulnerabilities FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY defense_compliance_service_role_all
  ON defense.compliance_requirements FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY defense_security_events_service_role_all
  ON defense.security_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY defense_pentest_results_service_role_all
  ON defense.pentest_results FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY defense_audits_authenticated_select_own
  ON defense.audits FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM platform.tenants t
      WHERE t.id = defense.audits.tenant_id
        AND t.slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
    )
  );

CREATE POLICY defense_vulnerabilities_authenticated_select_own
  ON defense.vulnerabilities FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM platform.tenants t
      WHERE t.id = defense.vulnerabilities.tenant_id
        AND t.slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
    )
  );

CREATE POLICY defense_compliance_authenticated_select_own
  ON defense.compliance_requirements FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM platform.tenants t
      WHERE t.id = defense.compliance_requirements.tenant_id
        AND t.slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
    )
  );

CREATE POLICY defense_security_events_authenticated_select_own
  ON defense.security_events FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM platform.tenants t
      WHERE t.id = defense.security_events.tenant_id
        AND t.slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
    )
  );

CREATE POLICY defense_pentest_results_authenticated_select_own
  ON defense.pentest_results FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'tenant_slug') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM platform.tenants t
      WHERE t.id = defense.pentest_results.tenant_id
        AND t.slug = (auth.jwt() -> 'user_metadata' ->> 'tenant_slug')
    )
  );

GRANT USAGE ON SCHEMA defense TO service_role;
GRANT USAGE ON SCHEMA defense TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON defense.audits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON defense.vulnerabilities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON defense.compliance_requirements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON defense.security_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON defense.pentest_results TO service_role;

GRANT SELECT ON defense.audits TO authenticated;
GRANT SELECT ON defense.vulnerabilities TO authenticated;
GRANT SELECT ON defense.compliance_requirements TO authenticated;
GRANT SELECT ON defense.security_events TO authenticated;
GRANT SELECT ON defense.pentest_results TO authenticated;
