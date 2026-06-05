-- Peskids generic form builder schema
-- Enables multi-tenant form creation, field management, and submission tracking

BEGIN;

-- Forms table: core form definitions
CREATE TABLE IF NOT EXISTS peskids.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id text NOT NULL, -- Human-readable form identifier
  tenant_slug text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  settings jsonb DEFAULT '{}'::jsonb, -- Form-level settings (successMessage, etc.)
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT forms_unique UNIQUE(tenant_slug, form_id)
);

CREATE INDEX IF NOT EXISTS idx_forms_tenant ON peskids.forms(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_forms_status ON peskids.forms(tenant_slug, status);

-- Form fields table: field definitions for each form
CREATE TABLE IF NOT EXISTS peskids.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES peskids.forms(id) ON DELETE CASCADE,
  field_id text NOT NULL, -- Unique field identifier within form (e.g., field_001)
  field_type text NOT NULL, -- text, email, phone, number, textarea, select, checkbox, radio, date, file
  label text NOT NULL,
  placeholder text,
  required boolean DEFAULT false,
  options jsonb DEFAULT NULL, -- For select/radio/checkbox: array of {value, label}
  validation jsonb DEFAULT NULL, -- Custom validation rules
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT form_fields_unique UNIQUE(form_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_form_fields_form ON peskids.form_fields(form_id);

-- Form submissions table: individual form submissions
CREATE TABLE IF NOT EXISTS peskids.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id text NOT NULL, -- Human-readable submission identifier
  tenant_slug text NOT NULL,
  form_id uuid NOT NULL REFERENCES peskids.forms(id) ON DELETE RESTRICT,
  user_id uuid, -- Optional: authenticated user who submitted
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb, -- Key-value map of field_id -> user_value
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('started', 'submitted', 'reviewed', 'graded')),
  score integer, -- For educational assessments
  feedback text, -- For teacher feedback
  ip_address inet,
  user_agent text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT form_submissions_unique UNIQUE(tenant_slug, submission_id)
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant ON peskids.form_submissions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON peskids.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON peskids.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON peskids.form_submissions(created_at DESC);

-- Enable RLS on all new tables
ALTER TABLE peskids.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role (backend) has full access
CREATE POLICY "service_role_full_forms" ON peskids.forms
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_full_form_fields" ON peskids.form_fields
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_full_form_submissions" ON peskids.form_submissions
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- RLS Policies: Authenticated users can read forms and submissions from their tenant
CREATE POLICY "authenticated_read_forms" ON peskids.forms
  FOR SELECT
  USING (
    tenant_slug IN (
      SELECT t.slug
      FROM platform.tenant_memberships tm
      INNER JOIN platform.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "authenticated_read_form_fields" ON peskids.form_fields
  FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM peskids.forms
      WHERE tenant_slug IN (
        SELECT t.slug
        FROM platform.tenant_memberships tm
        INNER JOIN platform.tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = auth.uid() AND tm.status = 'active'
      )
    )
  );

CREATE POLICY "authenticated_read_form_submissions" ON peskids.form_submissions
  FOR SELECT
  USING (
    tenant_slug IN (
      SELECT t.slug
      FROM platform.tenant_memberships tm
      INNER JOIN platform.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "authenticated_write_form_submissions" ON peskids.form_submissions
  FOR INSERT WITH CHECK (
    tenant_slug IN (
      SELECT t.slug
      FROM platform.tenant_memberships tm
      INNER JOIN platform.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

COMMIT;
