-- Additive Franchise OS brand/suppliers/training/support/docs (after 0100).
-- Does NOT drop platform.peskids_franchises (0090) or rewrite 0098/0099/0100.
-- NEEDS_PRODUCTION_MIGRATION_APPROVAL — do not apply to prod from this PR.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.brand_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  category text NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  requirement text NOT NULL,
  evidence_type text NOT NULL DEFAULT 'document'
    CHECK (evidence_type IN ('photo', 'document', 'observation', 'metric', 'other')),
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code, version)
);

CREATE TABLE IF NOT EXISTS platform.franchise_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'conditional', 'suspended', 'expired')),
  policy text NOT NULL DEFAULT 'approved_only'
    CHECK (policy IN ('mandatory', 'approved_only', 'recommended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.training_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  external_ref text NOT NULL,
  role text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  valid_for_months integer,
  certification_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_ref, role)
);

CREATE TABLE IF NOT EXISTS platform.training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  requirement_id uuid NOT NULL REFERENCES platform.training_requirements (id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  sla_hours integer,
  assigned_to text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.franchise_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (
    kind IN (
      'agreement', 'manual', 'brand_guide', 'audit_evidence',
      'opening_evidence', 'certificate', 'supplier_contract', 'other'
    )
  ),
  uri text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('network', 'unit', 'franchisee', 'internal')),
  owner_scope text NOT NULL DEFAULT 'network'
    CHECK (owner_scope IN ('network', 'unit', 'franchisee')),
  version text NOT NULL DEFAULT '1',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_standards_tenant ON platform.brand_standards (tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_franchise_suppliers_tenant ON platform.franchise_suppliers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_training_requirements_tenant ON platform.training_requirements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_unit ON platform.training_completions (tenant_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_support_cases_unit ON platform.support_cases (tenant_id, unit_id, status);
CREATE INDEX IF NOT EXISTS idx_franchise_documents_tenant ON platform.franchise_documents (tenant_id, kind);

CREATE OR REPLACE FUNCTION platform.franchise_assert_ops_unit_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  unit_tenant uuid;
BEGIN
  IF NEW.unit_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT tenant_id INTO unit_tenant FROM platform.franchise_units WHERE id = NEW.unit_id;
  IF unit_tenant IS NULL OR unit_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'ops catalog unit tenant mismatch';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_training_completions_tenant ON platform.training_completions;
CREATE TRIGGER trg_training_completions_tenant
  BEFORE INSERT OR UPDATE ON platform.training_completions
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_ops_unit_tenant();

DROP TRIGGER IF EXISTS trg_support_cases_tenant ON platform.support_cases;
CREATE TRIGGER trg_support_cases_tenant
  BEFORE INSERT OR UPDATE ON platform.support_cases
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_ops_unit_tenant();

DROP TRIGGER IF EXISTS trg_franchise_documents_tenant ON platform.franchise_documents;
CREATE TRIGGER trg_franchise_documents_tenant
  BEFORE INSERT OR UPDATE ON platform.franchise_documents
  FOR EACH ROW EXECUTE FUNCTION platform.franchise_assert_ops_unit_tenant();

ALTER TABLE platform.brand_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.franchise_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.franchise_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_brand_standards ON platform.brand_standards;
CREATE POLICY service_role_all_brand_standards
  ON platform.brand_standards FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_all_franchise_suppliers ON platform.franchise_suppliers;
CREATE POLICY service_role_all_franchise_suppliers
  ON platform.franchise_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_all_training_requirements ON platform.training_requirements;
CREATE POLICY service_role_all_training_requirements
  ON platform.training_requirements FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_all_training_completions ON platform.training_completions;
CREATE POLICY service_role_all_training_completions
  ON platform.training_completions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_all_support_cases ON platform.support_cases;
CREATE POLICY service_role_all_support_cases
  ON platform.support_cases FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS service_role_all_franchise_documents ON platform.franchise_documents;
CREATE POLICY service_role_all_franchise_documents
  ON platform.franchise_documents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS brand_standards_authenticated_select ON platform.brand_standards;
CREATE POLICY brand_standards_authenticated_select
  ON platform.brand_standards FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_has_tenant_assignment(tenant_id)
  );
DROP POLICY IF EXISTS brand_standards_authenticated_write ON platform.brand_standards;
CREATE POLICY brand_standards_authenticated_write
  ON platform.brand_standards FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_has_tenant_assignment(tenant_id)
  );

DROP POLICY IF EXISTS franchise_suppliers_authenticated_select ON platform.franchise_suppliers;
CREATE POLICY franchise_suppliers_authenticated_select
  ON platform.franchise_suppliers FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_has_tenant_assignment(tenant_id)
  );
DROP POLICY IF EXISTS franchise_suppliers_authenticated_write ON platform.franchise_suppliers;
CREATE POLICY franchise_suppliers_authenticated_write
  ON platform.franchise_suppliers FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_has_tenant_assignment(tenant_id)
  );

DROP POLICY IF EXISTS training_requirements_authenticated_select ON platform.training_requirements;
CREATE POLICY training_requirements_authenticated_select
  ON platform.training_requirements FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_has_tenant_assignment(tenant_id)
  );
DROP POLICY IF EXISTS training_requirements_authenticated_write ON platform.training_requirements;
CREATE POLICY training_requirements_authenticated_write
  ON platform.training_requirements FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_has_tenant_assignment(tenant_id)
  );

DROP POLICY IF EXISTS training_completions_authenticated_select ON platform.training_completions;
CREATE POLICY training_completions_authenticated_select
  ON platform.training_completions FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );
DROP POLICY IF EXISTS training_completions_authenticated_write ON platform.training_completions;
CREATE POLICY training_completions_authenticated_write
  ON platform.training_completions FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS support_cases_authenticated_select ON platform.support_cases;
CREATE POLICY support_cases_authenticated_select
  ON platform.support_cases FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );
DROP POLICY IF EXISTS support_cases_authenticated_write ON platform.support_cases;
CREATE POLICY support_cases_authenticated_write
  ON platform.support_cases FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND platform.franchise_can_access_unit(tenant_id, unit_id)
  );

DROP POLICY IF EXISTS franchise_documents_authenticated_select ON platform.franchise_documents;
CREATE POLICY franchise_documents_authenticated_select
  ON platform.franchise_documents FOR SELECT TO authenticated
  USING (
    NOT platform.franchise_is_teacher()
    AND (
      unit_id IS NULL AND platform.franchise_has_tenant_assignment(tenant_id)
      OR unit_id IS NOT NULL AND platform.franchise_can_access_unit(tenant_id, unit_id)
    )
  );
DROP POLICY IF EXISTS franchise_documents_authenticated_write ON platform.franchise_documents;
CREATE POLICY franchise_documents_authenticated_write
  ON platform.franchise_documents FOR INSERT TO authenticated
  WITH CHECK (
    NOT platform.franchise_is_teacher()
    AND NOT platform.franchise_is_auditor()
    AND (
      unit_id IS NULL AND platform.franchise_has_tenant_assignment(tenant_id)
      OR unit_id IS NOT NULL AND platform.franchise_can_access_unit(tenant_id, unit_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON
  platform.brand_standards,
  platform.franchise_suppliers,
  platform.training_requirements,
  platform.training_completions,
  platform.support_cases,
  platform.franchise_documents
TO service_role;

GRANT SELECT, INSERT, UPDATE ON
  platform.brand_standards,
  platform.franchise_suppliers,
  platform.training_requirements,
  platform.training_completions,
  platform.support_cases,
  platform.franchise_documents
TO authenticated;

COMMENT ON TABLE platform.brand_standards IS
  'Network brand standards catalog. Evidence lives as DocumentReference, not a signature vendor.';
COMMENT ON TABLE platform.franchise_suppliers IS
  'Approved supplier catalog. Status suspended/expired blocks procurement in app logic.';
COMMENT ON TABLE platform.support_cases IS
  'Unit-scoped support cases. SLA reminders are event contracts only.';

COMMIT;
