-- Franchise OS core (tenant-agnostic, reusable). First tenant: Peskids.
--
-- Rules of the road (mirror of docs/architecture/FRANCHISE-OS.md and the
-- @intcloudsysops/franchise-core package):
--  * tenant = Opsly tenant (fk platform.tenants). A tenant hosts 1..N
--    franchise networks; a network hosts franchisees, units, territories…
--    NEVER a new Opsly tenant per franchise/sede.
--  * A franchisee operates 1..N units; owned units (flagship/owned/mobile) have
--    franchisee_id NULL.
--  * Royalty rules are VERSIONED: a new version opens a new effective_from and
--    the previous version's effective_to is closed. History is never edited.
--    Partial unique index enforces at most ONE open (effective_to IS NULL)
--    version per rule.
--  * royalty_calculations are IMMUTABLE (no UPDATE/DELETE via RLS, same pattern
--    as platform.audit_events) and pin rule_version + snapshot inputs/
--    calculation/result as JSON so history is explainable without recompute.
--  * Sales reports are provider-agnostic (platform/stripe/wompi/pos/manual/
--    external). Payments and e-signature are adapter contracts, not built here.
--
-- Idempotent. Backfills from platform.peskids_franchises (tenant peskids) into
-- the generic franchise_units / franchise_locations tables.

BEGIN;

-- Network = the franchise brand/system owned by a tenant.
CREATE TABLE IF NOT EXISTS platform.franchise_networks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_franchise_networks_tenant
  ON platform.franchise_networks(tenant_id, status);

-- Franchisee (legal counterparty). Owned units have no franchisee.
CREATE TABLE IF NOT EXISTS platform.franchisees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  network_id uuid REFERENCES platform.franchise_networks(id) ON DELETE SET NULL,
  legal_name text NOT NULL,
  tax_id text,
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'active', 'suspended', 'terminated')),
  primary_contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_franchisees_tenant_status
  ON platform.franchisees(tenant_id, status);

-- Operating unit (sede/unidad). type matches FRANCHISE_UNIT_TYPES.
CREATE TABLE IF NOT EXISTS platform.franchise_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  network_id uuid REFERENCES platform.franchise_networks(id) ON DELETE SET NULL,
  franchisee_id uuid REFERENCES platform.franchisees(id) ON DELETE SET NULL,
  code text NOT NULL CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('flagship', 'owned', 'franchise', 'mobile')),
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'approved', 'opening', 'active', 'suspended', 'archived')),
  opening_status text NOT NULL DEFAULT 'not_started'
    CHECK (opening_status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'blocked')),
  primary_location_id uuid,
  is_primary boolean NOT NULL DEFAULT false,
  external_source text,
  external_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- At most one primary unit per (tenant_id, network_id).
CREATE UNIQUE INDEX IF NOT EXISTS uq_franchise_units_one_primary_per_network
  ON platform.franchise_units(tenant_id, network_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_franchise_units_tenant_status
  ON platform.franchise_units(tenant_id, status, type);

-- Locations under a unit.
CREATE TABLE IF NOT EXISTS platform.franchise_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'other'
    CHECK (kind IN ('pool', 'home_zone', 'office', 'service_area', 'storefront', 'warehouse', 'other')),
  address text,
  city text,
  region text,
  country text,
  geo jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, slug)
);

-- Exclusive-service areas. Geometry is persisted as jsonb (GeoReference);
-- enforcement happens in the core engine (conservative bbox/radius) and a
-- future GIS provider — no GIS engine is embedded here.
CREATE TABLE IF NOT EXISTS platform.franchise_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES platform.franchise_units(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('radius', 'polygon', 'municipality', 'service_area')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  exclusive boolean NOT NULL DEFAULT false,
  exclusive_for text CHECK (exclusive_for IN ('fixed_location', 'home_service', 'both')),
  valid_from timestamptz,
  valid_to timestamptz,
  service_model text,
  geo jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_from IS NULL OR valid_to IS NULL OR valid_from <= valid_to)
);

CREATE INDEX IF NOT EXISTS idx_franchise_territories_tenant_status
  ON platform.franchise_territories(tenant_id, status, type);

-- Franchise agreements. unit_ids are expanded into a junction table.
CREATE TABLE IF NOT EXISTS platform.franchise_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  franchisee_id uuid NOT NULL REFERENCES platform.franchisees(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'pending_signature', 'active', 'expiring', 'expired', 'terminated', 'suspended')),
  effective_date timestamptz NOT NULL,
  expiration_date timestamptz NOT NULL,
  renewal_type text NOT NULL DEFAULT 'auto' CHECK (renewal_type IN ('fixed', 'auto', 'manual')),
  renewal_term_months integer,
  notice_days integer NOT NULL DEFAULT 90,
  canonical_fee jsonb,
  royalty_rule_id uuid,
  territory_id uuid,
  document_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_date <= expiration_date)
);

CREATE TABLE IF NOT EXISTS platform.franchise_agreement_units (
  agreement_id uuid NOT NULL REFERENCES platform.franchise_agreements(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  PRIMARY KEY (agreement_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_franchise_agreements_tenant_state
  ON platform.franchise_agreements(tenant_id, state, expiration_date);

-- VERSIONED royalty rules. Uniqueness on (tenant_id, rule_id, version);
-- partial unique index (rule_id, version) with effective_to IS NULL enforces a
-- single open window per rule.
CREATE TABLE IF NOT EXISTS platform.royalty_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  network_id uuid REFERENCES platform.franchise_networks(id) ON DELETE SET NULL,
  rule_id uuid NOT NULL DEFAULT gen_random_uuid(),
  version integer NOT NULL CHECK (version >= 1),
  name text NOT NULL,
  basis text NOT NULL CHECK (basis IN ('gross_sales', 'net_sales')),
  percentage numeric(10,4) NOT NULL CHECK (percentage >= 0),
  minimum_amount numeric(18,2),
  fixed_fee numeric(18,2),
  currency text NOT NULL CHECK (char_length(currency) = 3),
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  excluded_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_treatment text NOT NULL DEFAULT 'exclusive' CHECK (tax_treatment IN ('gross', 'net_of_tax', 'exclusive')),
  effective_from timestamptz NOT NULL,
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, rule_id, version),
  CHECK (effective_to IS NULL OR effective_from < effective_to)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_royalty_rules_one_open_version
  ON platform.royalty_rules(rule_id)
  WHERE effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_royalty_rules_tenant
  ON platform.royalty_rules(tenant_id, rule_id, version);

-- Provider-agnostic sales reports (platform/stripe/wompi/pos/manual/external).
CREATE TABLE IF NOT EXISTS platform.sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  gross_sales numeric(18,2) NOT NULL DEFAULT 0,
  refunds numeric(18,2) NOT NULL DEFAULT 0,
  taxes numeric(18,2) NOT NULL DEFAULT 0,
  excluded_sales numeric(18,2) NOT NULL DEFAULT 0,
  net_sales numeric(18,2) NOT NULL DEFAULT 0,
  currency text NOT NULL CHECK (char_length(currency) = 3),
  source text NOT NULL CHECK (source IN ('platform', 'stripe', 'wompi', 'pos', 'manual', 'external')),
  source_reference text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'verified', 'disputed', 'rejected')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_start <= period_end),
  UNIQUE (tenant_id, unit_id, period_start, source)
);

CREATE INDEX IF NOT EXISTS idx_sales_reports_tenant_unit_period
  ON platform.sales_reports(tenant_id, unit_id, period_end DESC);

-- IMMUTABLE royalty calculations (no UPDATE/DELETE via RLS). Idempotency via
-- unique key mirroring royaltyCalculationKey(): tenant:unit:report:rule_version.
CREATE TABLE IF NOT EXISTS platform.royalty_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  sales_report_id uuid NOT NULL REFERENCES platform.sales_reports(id) ON DELETE RESTRICT,
  rule_id uuid NOT NULL,
  rule_version integer NOT NULL,
  basis text NOT NULL CHECK (basis IN ('gross_sales', 'net_sales')),
  reported_sales numeric(18,2) NOT NULL,
  exclusions numeric(18,2) NOT NULL DEFAULT 0,
  royalty_base numeric(18,2) NOT NULL,
  percentage numeric(10,4) NOT NULL,
  percentage_amount numeric(18,2) NOT NULL,
  fixed_fee numeric(18,2) NOT NULL DEFAULT 0,
  minimum_applied boolean NOT NULL DEFAULT false,
  royalty_due numeric(18,2) NOT NULL,
  currency text NOT NULL CHECK (char_length(currency) = 3),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'invoiced', 'paid', 'waived', 'disputed')),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculation jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, unit_id, sales_report_id, rule_version)
);

CREATE INDEX IF NOT EXISTS idx_royalty_calculations_tenant_unit
  ON platform.royalty_calculations(tenant_id, unit_id, rule_version);

-- Payments against a royalty calculation.
CREATE TABLE IF NOT EXISTS platform.royalty_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  calculation_id uuid NOT NULL REFERENCES platform.royalty_calculations(id) ON DELETE RESTRICT,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL CHECK (char_length(currency) = 3),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'paid', 'failed', 'waived', 'disputed')),
  method text,
  external_reference text,
  scheduled_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Opening lifecycle.
CREATE TABLE IF NOT EXISTS platform.opening_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  phase text NOT NULL
    CHECK (phase IN ('contract', 'territory', 'location', 'design', 'permits', 'equipment', 'staff', 'training', 'soft_launch', 'opening')),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'on_hold', 'completed', 'blocked')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.opening_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  checklist_id uuid NOT NULL REFERENCES platform.opening_checklists(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  phase text NOT NULL
    CHECK (phase IN ('contract', 'territory', 'location', 'design', 'permits', 'equipment', 'staff', 'training', 'soft_launch', 'opening')),
  name text NOT NULL,
  owner text,
  due_date timestamptz,
  required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Brand standards, suppliers, training, support, documents (Franchise OS keeps
-- references, never blobs).
CREATE TABLE IF NOT EXISTS platform.brand_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  network_id uuid REFERENCES platform.franchise_networks(id) ON DELETE SET NULL,
  category text NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  requirement text NOT NULL,
  evidence_type text NOT NULL DEFAULT 'none' CHECK (evidence_type IN ('photo', 'document', 'declaration', 'inspection', 'none')),
  severity text NOT NULL DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor')),
  version integer NOT NULL DEFAULT 1,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.supplier_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  name text NOT NULL,
  required text NOT NULL DEFAULT 'recommended' CHECK (required IN ('mandatory', 'approved_only', 'recommended')),
  document_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.approved_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  category text NOT NULL,
  legal_name text NOT NULL,
  status text NOT NULL DEFAULT 'conditional' CHECK (status IN ('approved', 'conditional', 'suspended', 'expired')),
  requirement_id uuid REFERENCES platform.supplier_requirements(id) ON DELETE SET NULL,
  rating numeric(3,1) CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  contract_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.training_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  role text NOT NULL,
  course_id text,
  external_ref text,
  name text NOT NULL,
  required boolean NOT NULL DEFAULT true,
  valid_for_months integer,
  certification_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES platform.franchise_units(id) ON DELETE SET NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  sla text,
  assigned_to text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.franchise_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES platform.franchise_units(id) ON DELETE SET NULL,
  kind text NOT NULL
    CHECK (kind IN ('agreement', 'manual', 'brand_guide', 'audit_evidence', 'certificate', 'supplier_contract', 'other')),
  title text NOT NULL,
  ref text NOT NULL,
  visibility text NOT NULL DEFAULT 'network' CHECK (visibility IN ('network', 'franchisee', 'unit', 'support')),
  owner_scope text CHECK (owner_scope IN ('tenant', 'franchisee', 'unit')),
  version text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audits + findings + corrective actions.
CREATE TABLE IF NOT EXISTS platform.audit_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  network_id uuid REFERENCES platform.franchise_networks(id) ON DELETE SET NULL,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  template_id uuid REFERENCES platform.audit_templates(id) ON DELETE SET NULL,
  auditor text,
  scheduled_at timestamptz,
  performed_at timestamptz,
  score numeric(5,2) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  audit_id uuid NOT NULL REFERENCES platform.audits(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'info')),
  standard_ref text,
  evidence text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.corrective_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL REFERENCES platform.audit_findings(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES platform.franchise_units(id) ON DELETE CASCADE,
  owner text,
  due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'overdue')),
  resolution text,
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audits_tenant_unit_status
  ON platform.audits(tenant_id, unit_id, status);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_tenant_status_due
  ON platform.corrective_actions(tenant_id, status, due_date);

-- PRIMARY location FK (set after all tables exist).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_franchise_units_primary_location'
      AND conrelid = 'platform.franchise_units'::regclass
  ) THEN
    ALTER TABLE platform.franchise_units
      ADD CONSTRAINT fk_franchise_units_primary_location
      FOREIGN KEY (primary_location_id) REFERENCES platform.franchise_locations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- updated_at triggers (platform.set_updated_at from 0036_billing_invoices.sql).
DROP TRIGGER IF EXISTS franchise_networks_updated_at ON platform.franchise_networks;
CREATE TRIGGER franchise_networks_updated_at
  BEFORE UPDATE ON platform.franchise_networks
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS franchisees_updated_at ON platform.franchisees;
CREATE TRIGGER franchisees_updated_at
  BEFORE UPDATE ON platform.franchisees
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS franchise_units_updated_at ON platform.franchise_units;
CREATE TRIGGER franchise_units_updated_at
  BEFORE UPDATE ON platform.franchise_units
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS franchise_locations_updated_at ON platform.franchise_locations;
CREATE TRIGGER franchise_locations_updated_at
  BEFORE UPDATE ON platform.franchise_locations
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS franchise_territories_updated_at ON platform.franchise_territories;
CREATE TRIGGER franchise_territories_updated_at
  BEFORE UPDATE ON platform.franchise_territories
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS franchise_agreements_updated_at ON platform.franchise_agreements;
CREATE TRIGGER franchise_agreements_updated_at
  BEFORE UPDATE ON platform.franchise_agreements
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS royalty_rules_updated_at ON platform.royalty_rules;
CREATE TRIGGER royalty_rules_updated_at
  BEFORE UPDATE ON platform.royalty_rules
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS sales_reports_updated_at ON platform.sales_reports;
CREATE TRIGGER sales_reports_updated_at
  BEFORE UPDATE ON platform.sales_reports
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS royalty_payments_updated_at ON platform.royalty_payments;
CREATE TRIGGER royalty_payments_updated_at
  BEFORE UPDATE ON platform.royalty_payments
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

-- RLS: service_role has full access on mutable tables; royalty_calculations is
-- immutable like platform.audit_events. Deny UPDATE/DELETE explicitly.

DO $$
DECLARE
  t text;
  mutable_tables text[] := ARRAY[
    'franchise_networks', 'franchisees', 'franchise_units', 'franchise_locations',
    'franchise_territories', 'franchise_agreements', 'franchise_agreement_units',
    'royalty_rules', 'sales_reports', 'royalty_payments', 'opening_checklists',
    'opening_tasks', 'brand_standards', 'supplier_requirements', 'approved_suppliers',
    'training_requirements', 'support_cases', 'franchise_documents',
    'audit_templates', 'audits', 'audit_findings', 'corrective_actions'
  ];
BEGIN
  FOREACH t IN ARRAY mutable_tables LOOP
    EXECUTE format('ALTER TABLE platform.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS service_role_all_%I ON platform.%I', t, t
    );
    EXECUTE format(
      'CREATE POLICY service_role_all_%I ON platform.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON platform.%I TO service_role', t);
  END LOOP;
END $$;

-- Immutable royalty_calculations (service_role INSERT/SELECT only, like audit_events).
ALTER TABLE platform.royalty_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS royalty_calculations_insert_service_only ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_insert_service_only
  ON platform.royalty_calculations FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS royalty_calculations_select_service_only ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_select_service_only
  ON platform.royalty_calculations FOR SELECT TO service_role USING (true);

DROP POLICY IF EXISTS royalty_calculations_no_update ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_no_update
  ON platform.royalty_calculations FOR UPDATE USING (false);

DROP POLICY IF EXISTS royalty_calculations_no_delete ON platform.royalty_calculations;
CREATE POLICY royalty_calculations_no_delete
  ON platform.royalty_calculations FOR DELETE USING (false);

GRANT INSERT, SELECT ON platform.royalty_calculations TO service_role;

-- Backfill: Peskids unit + location models into the generic tables
-- (tenant peskids). Statuses map: active→active, paused→suspended, archived→archived.

DO $$
DECLARE
  v_tenant_id uuid;
  v_network_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM platform.tenants WHERE slug = 'peskids';
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO platform.franchise_networks (tenant_id, slug, name, status)
  VALUES (v_tenant_id, 'peskids', 'Peskids', 'active')
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  SELECT id INTO v_network_id
  FROM platform.franchise_networks
  WHERE tenant_id = v_tenant_id AND slug = 'peskids';

  -- Units from the Peskids operating units (no franchisee → owned).
  INSERT INTO platform.franchise_units
    (tenant_id, network_id, franchisee_id, code, name, type, status, is_primary, external_source, external_ref)
  SELECT
    v_tenant_id,
    v_network_id,
    NULL,
    pf.slug,
    pf.name,
    pf.type,
    CASE pf.status WHEN 'active' THEN 'active' WHEN 'paused' THEN 'suspended' ELSE 'archived' END,
    pf.is_primary,
    'platform.peskids_franchises',
    pf.id::text
  FROM platform.peskids_franchises pf
  WHERE pf.tenant_slug = 'peskids'
  ON CONFLICT (tenant_id, code) DO UPDATE
  SET name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      is_primary = EXCLUDED.is_primary;

  -- Locations from the Peskids location model.
  INSERT INTO platform.franchise_locations (tenant_id, unit_id, slug, name, kind, address, city, active)
  SELECT
    v_tenant_id,
    fu.id,
    pfl.slug,
    pfl.name,
    pfl.kind,
    pfl.address,
    pfl.city,
    pfl.active
  FROM platform.peskids_franchise_locations pfl
  JOIN platform.peskids_franchises pf ON pf.id = pfl.franchise_id
  JOIN platform.franchise_units fu
    ON fu.tenant_id = v_tenant_id
   AND fu.external_source = 'platform.peskids_franchises'
   AND fu.external_ref = pf.id::text
  WHERE pf.tenant_slug = 'peskids'
  ON CONFLICT (unit_id, slug) DO UPDATE
  SET name = EXCLUDED.name, kind = EXCLUDED.kind, address = EXCLUDED.address, city = EXCLUDED.city, active = EXCLUDED.active;

  -- Point flagged units to their primary location (best-effort, Peskids has one
  -- primary location per unit sourced above).
  UPDATE platform.franchise_units fu
  SET primary_location_id = fl.id
  FROM platform.franchise_locations fl
  WHERE fu.tenant_id = v_tenant_id
    AND fu.primary_location_id IS NULL
    AND fl.unit_id = fu.id;
END $$;

COMMIT;
