-- Extend Form System for Multi-Franchise Support
-- Allow each franchise to have their own forms with shared templates

BEGIN;

-- ========================
-- Franchise Form Templates
-- ========================

-- Table to track which templates are assigned to which franchises
CREATE TABLE IF NOT EXISTS peskids.franchise_form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES peskids.form_templates(id) ON DELETE CASCADE,

  -- Customization per franchise
  custom_name text, -- Override template name for this franchise
  custom_description text,
  custom_fields jsonb, -- Override fields for this franchise

  -- Status
  is_enabled boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false, -- Primary form for this franchise

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_franchise_template UNIQUE (franchise_tenant_id, template_id)
);

CREATE INDEX idx_franchise_form_templates_tenant ON peskids.franchise_form_templates(franchise_tenant_id);
CREATE INDEX idx_franchise_form_templates_active ON peskids.franchise_form_templates(franchise_tenant_id, is_enabled);

-- ========================
-- Franchise-Scoped Deliveries & Responses
-- ========================

-- Add franchise_tenant_id to form_deliveries
ALTER TABLE peskids.form_deliveries
ADD COLUMN IF NOT EXISTS franchise_tenant_id uuid REFERENCES platform.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_deliveries_franchise
  ON peskids.form_deliveries (franchise_tenant_id, delivery_status);

-- Add franchise_tenant_id to form_responses
ALTER TABLE peskids.form_responses
ADD COLUMN IF NOT EXISTS franchise_tenant_id uuid REFERENCES platform.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_responses_franchise
  ON peskids.form_responses (franchise_tenant_id, submitted_at DESC);

-- ========================
-- RLS Policies for Multi-Tenant Forms
-- ========================

-- Franchise templates: each franchise can read/write their own templates
DROP POLICY IF EXISTS "franchise_form_templates_select" ON peskids.franchise_form_templates;
CREATE POLICY "franchise_form_templates_select" ON peskids.franchise_form_templates
  FOR SELECT
  USING (
    franchise_tenant_id = (
      SELECT id FROM platform.tenants
      WHERE tenant_slug = current_setting('auth.tenant_slug', true)::TEXT
    )
    OR auth.jwt() ->> 'is_superuser' = 'true'
  );

DROP POLICY IF EXISTS "franchise_form_templates_modify" ON peskids.franchise_form_templates;
CREATE POLICY "franchise_form_templates_modify" ON peskids.franchise_form_templates
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'is_superuser' = 'true'
  );

DROP POLICY IF EXISTS "franchise_form_templates_update" ON peskids.franchise_form_templates;
CREATE POLICY "franchise_form_templates_update" ON peskids.franchise_form_templates
  FOR UPDATE
  USING (auth.jwt() ->> 'is_superuser' = 'true')
  WITH CHECK (auth.jwt() ->> 'is_superuser' = 'true');

-- Form deliveries: franchises can only see their own deliveries
DROP POLICY IF EXISTS "franchise_form_deliveries_select" ON peskids.form_deliveries;
CREATE POLICY "franchise_form_deliveries_select" ON peskids.form_deliveries
  FOR SELECT
  USING (
    franchise_tenant_id = (
      SELECT id FROM platform.tenants
      WHERE tenant_slug = current_setting('auth.tenant_slug', true)::TEXT
    )
    OR auth.jwt() ->> 'is_superuser' = 'true'
    OR franchise_tenant_id IS NULL AND auth.jwt() ->> 'is_superuser' = 'true'
  );

-- Form responses: franchises can only see their own responses
DROP POLICY IF EXISTS "franchise_form_responses_select" ON peskids.form_responses;
CREATE POLICY "franchise_form_responses_select" ON peskids.form_responses
  FOR SELECT
  USING (
    franchise_tenant_id = (
      SELECT id FROM platform.tenants
      WHERE tenant_slug = current_setting('auth.tenant_slug', true)::TEXT
    )
    OR auth.jwt() ->> 'is_superuser' = 'true'
    OR franchise_tenant_id IS NULL AND auth.jwt() ->> 'is_superuser' = 'true'
  );

-- ========================
-- Grant RLS for new table
-- ========================

ALTER TABLE peskids.franchise_form_templates ENABLE ROW LEVEL SECURITY;

COMMIT;
