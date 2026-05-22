-- Peskids MVP product tables (incubation in Opsly; portable to peskids-platform schema later)

CREATE TABLE IF NOT EXISTS platform.peskids_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids' REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  grade_interested text NOT NULL,
  referral_source text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost', 'converted')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peskids_leads_tenant_created
  ON platform.peskids_leads (tenant_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS platform.peskids_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids' REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  child_name text NOT NULL,
  satisfaction smallint NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  suggestion text,
  contact_me_back boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'action_required', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peskids_feedback_tenant_created
  ON platform.peskids_feedback (tenant_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_peskids_feedback_low_rating
  ON platform.peskids_feedback (tenant_slug, satisfaction)
  WHERE satisfaction < 3;

ALTER TABLE platform.peskids_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.peskids_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_peskids_leads"
  ON platform.peskids_leads FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_peskids_feedback"
  ON platform.peskids_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.peskids_leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.peskids_feedback TO service_role;
