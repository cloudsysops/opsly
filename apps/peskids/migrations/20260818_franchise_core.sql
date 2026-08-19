-- Franchise OS reusable schema (additive).
-- Does NOT drop platform.peskids_franchises (0090). Owned Peskids units are
-- backfilled with franchisee_id NULL. Never one Opsly tenant per sede.
-- NEEDS_PRODUCTION_MIGRATION_APPROVAL — do not apply to prod from this PR.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.franchise_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS platform.franchisees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  tax_id text,
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'approved', 'active', 'suspended', 'terminated')),
  primary_contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.franchise_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  network_id uuid NOT NULL REFERENCES platform.franchise_networks (id) ON DELETE CASCADE,
  franchisee_id uuid REFERENCES platform.franchisees (id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('flagship', 'owned', 'franchise', 'mobile')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'prospect', 'approved', 'opening', 'active', 'paused', 'suspended', 'archived')),
  opening_status text CHECK (
    opening_status IS NULL OR opening_status IN (
      'contract', 'territory', 'location', 'design', 'permits',
      'equipment', 'staff', 'training', 'soft_launch', 'opening'
    )
  ),
  primary_location_id uuid,
  territory_id uuid,
  agreement_id uuid,
  legacy_operating_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS platform.franchise_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('pool', 'home_zone', 'office', 'service_area', 'store', 'other')),
  address text,
  city text,
  geo jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, code)
);

CREATE TABLE IF NOT EXISTS platform.franchise_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid REFERENCES platform.franchise_units (id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'revoked')),
  geometry jsonb NOT NULL,
  exclusive boolean NOT NULL DEFAULT false,
  exclusive_for text NOT NULL DEFAULT 'both'
    CHECK (exclusive_for IN ('fixed_location', 'home_service', 'both')),
  valid_from date NOT NULL,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.franchise_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  franchisee_id uuid NOT NULL REFERENCES platform.franchisees (id) ON DELETE RESTRICT,
  unit_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_signature', 'active', 'expiring', 'expired', 'terminated', 'suspended')),
  effective_date date NOT NULL,
  expiration_date date NOT NULL,
  renewal_type text NOT NULL DEFAULT 'franchisor_discretion'
    CHECK (renewal_type IN ('none', 'automatic', 'mutual_consent', 'franchisor_discretion')),
  renewal_term_months integer,
  notice_days integer NOT NULL DEFAULT 90,
  canonical_fee_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'COP',
  royalty_rule_id uuid,
  territory_id uuid REFERENCES platform.franchise_territories (id) ON DELETE SET NULL,
  document_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.royalty_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  basis text NOT NULL CHECK (basis IN ('gross_sales', 'net_sales')),
  percentage_bps integer NOT NULL CHECK (percentage_bps >= 0 AND percentage_bps <= 100000),
  minimum_amount_minor bigint,
  fixed_fee_minor bigint,
  currency char(3) NOT NULL DEFAULT 'COP',
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'annual')),
  excluded_categories text[] NOT NULL DEFAULT '{}',
  tax_treatment text NOT NULL DEFAULT 'unspecified'
    CHECK (tax_treatment IN ('inclusive', 'exclusive', 'unspecified')),
  effective_from date NOT NULL,
  effective_to date,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);

CREATE TABLE IF NOT EXISTS platform.sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_sales_minor bigint NOT NULL DEFAULT 0,
  refunds_minor bigint NOT NULL DEFAULT 0,
  taxes_minor bigint NOT NULL DEFAULT 0,
  excluded_sales_minor bigint NOT NULL DEFAULT 0,
  net_sales_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'COP',
  source text NOT NULL CHECK (source IN ('platform', 'stripe', 'wompi', 'pos', 'manual', 'external')),
  source_reference text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'accepted', 'disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, period_start, period_end, source)
);

CREATE TABLE IF NOT EXISTS platform.royalty_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  sales_report_id uuid NOT NULL REFERENCES platform.sales_reports (id) ON DELETE RESTRICT,
  royalty_rule_id uuid NOT NULL,
  rule_version integer NOT NULL,
  currency char(3) NOT NULL,
  inputs jsonb NOT NULL,
  royalty_due_minor bigint NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL UNIQUE,
  FOREIGN KEY (royalty_rule_id, rule_version)
    REFERENCES platform.royalty_rules (id, version)
);

CREATE TABLE IF NOT EXISTS platform.royalty_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  calculation_id uuid NOT NULL REFERENCES platform.royalty_calculations (id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL,
  currency char(3) NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'paid', 'failed', 'waived', 'disputed')),
  method text NOT NULL DEFAULT 'manual'
    CHECK (method IN ('manual', 'stripe', 'wompi', 'bank', 'other')),
  external_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.audit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.franchise_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES platform.audit_templates (id) ON DELETE RESTRICT,
  template_version integer NOT NULL,
  auditor text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  performed_at timestamptz,
  score integer,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES platform.franchise_audits (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  standard_ref text,
  evidence jsonb,
  notes text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS platform.corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES platform.audit_findings (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  owner text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'overdue')),
  resolution text,
  evidence jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.franchise_unit_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS platform.franchise_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change')),
  before jsonb,
  after jsonb,
  reason text
);

CREATE INDEX IF NOT EXISTS idx_franchise_units_tenant ON platform.franchise_units (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_franchise_territories_tenant ON platform.franchise_territories (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_franchise_agreements_tenant ON platform.franchise_agreements (tenant_id, expiration_date);
CREATE INDEX IF NOT EXISTS idx_sales_reports_unit_period ON platform.sales_reports (unit_id, period_start);
CREATE INDEX IF NOT EXISTS idx_royalty_calc_tenant ON platform.royalty_calculations (tenant_id, unit_id);
CREATE INDEX IF NOT EXISTS idx_franchise_unit_members_user ON platform.franchise_unit_members (tenant_id, user_id, active);

CREATE OR REPLACE FUNCTION platform.forbid_royalty_calculation_rewrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.inputs IS DISTINCT FROM OLD.inputs
     OR NEW.royalty_due_minor IS DISTINCT FROM OLD.royalty_due_minor
     OR NEW.rule_version IS DISTINCT FROM OLD.rule_version
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
    RAISE EXCEPTION 'royalty_calculations are immutable snapshots; insert a new rule version instead';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS royalty_calculations_immutable ON platform.royalty_calculations;
CREATE TRIGGER royalty_calculations_immutable
  BEFORE UPDATE ON platform.royalty_calculations
  FOR EACH ROW
  EXECUTE FUNCTION platform.forbid_royalty_calculation_rewrite();

-- RLS: deny-by-default. service_role is the Peskids admin path today.
-- authenticated: tenant isolation via tenant_memberships; unit isolation via franchise_unit_members
-- for non-owner/admin roles.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'franchise_networks',
    'franchisees',
    'franchise_units',
    'franchise_locations',
    'franchise_territories',
    'franchise_agreements',
    'royalty_rules',
    'sales_reports',
    'royalty_calculations',
    'royalty_payments',
    'audit_templates',
    'franchise_audits',
    'audit_findings',
    'corrective_actions',
    'franchise_unit_members',
    'franchise_change_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE platform.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS service_role_all_%I ON platform.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY service_role_all_%I ON platform.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON platform.%I TO service_role', tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS franchise_units_authenticated_select ON platform.franchise_units;
CREATE POLICY franchise_units_authenticated_select
  ON platform.franchise_units
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM platform.tenant_memberships tm
      WHERE tm.tenant_id = franchise_units.tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM platform.franchise_unit_members m
      WHERE m.unit_id = franchise_units.id
        AND m.user_id = auth.uid()
        AND m.active = true
    )
  );

-- Backfill Peskids operating units as owned/flagship/mobile — not franchisees.
INSERT INTO platform.franchise_networks (tenant_id, slug, name, status)
SELECT t.id, 'default', t.name, 'active'
FROM platform.tenants t
WHERE t.slug = 'peskids'
ON CONFLICT (tenant_id, slug) DO NOTHING;

INSERT INTO platform.franchise_units (
  tenant_id, network_id, franchisee_id, code, name, type, status, legacy_operating_id
)
SELECT
  t.id,
  n.id,
  NULL,
  f.slug,
  f.name,
  f.type,
  CASE WHEN f.status = 'active' THEN 'active' WHEN f.status = 'paused' THEN 'paused' ELSE 'archived' END,
  f.id
FROM platform.tenants t
JOIN platform.franchise_networks n ON n.tenant_id = t.id AND n.slug = 'default'
JOIN platform.peskids_franchises f ON f.tenant_slug = t.slug
WHERE t.slug = 'peskids'
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO platform.franchise_locations (tenant_id, unit_id, code, name, kind, address, city, active)
SELECT
  u.tenant_id,
  u.id,
  loc.slug,
  loc.name,
  loc.kind,
  loc.address,
  loc.city,
  loc.active
FROM platform.peskids_franchise_locations loc
JOIN platform.franchise_units u ON u.legacy_operating_id = loc.franchise_id
ON CONFLICT (unit_id, code) DO NOTHING;

INSERT INTO platform.franchise_unit_members (tenant_id, unit_id, user_id, role, active)
SELECT
  u.tenant_id,
  u.id,
  m.user_id,
  m.role,
  m.active
FROM platform.peskids_franchise_staff_memberships m
JOIN platform.franchise_units u ON u.legacy_operating_id = m.franchise_id
ON CONFLICT (unit_id, user_id, role) DO NOTHING;

COMMENT ON TABLE platform.franchise_units IS
  'Reusable franchise operating units. Owned/flagship/mobile may have franchisee_id NULL. Never map a unit to a new Opsly tenant.';

COMMENT ON TABLE platform.royalty_calculations IS
  'Immutable royalty snapshots. Changing a rule requires a new version row, never an in-place rewrite.';

COMMIT;
