-- Family Registration Forms
-- Collect data from prospective families via email/link
-- Store responses in CRM and schedule trial classes

BEGIN;

-- Form templates
CREATE TABLE IF NOT EXISTS peskids.form_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  name text NOT NULL,
  description text,
  form_type text NOT NULL CHECK (form_type IN ('enrolled_family', 'prospective_family', 'trial_class')),
  fields jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_templates_tenant_type
  ON peskids.form_templates (tenant_slug, form_type, status);

-- Sent forms (delivery tracking)
CREATE TABLE IF NOT EXISTS peskids.form_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  template_id uuid NOT NULL REFERENCES peskids.form_templates(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  recipient_phone text,
  recipient_name text,
  delivery_method text NOT NULL CHECK (delivery_method IN ('email', 'sms', 'whatsapp')),
  sent_at timestamptz,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced')),
  form_link text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_deliveries_tenant_recipient
  ON peskids.form_deliveries (tenant_slug, recipient_email, delivery_status);

CREATE INDEX IF NOT EXISTS idx_form_deliveries_status
  ON peskids.form_deliveries (tenant_slug, delivery_status, sent_at DESC);

-- Form responses
CREATE TABLE IF NOT EXISTS peskids.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  delivery_id uuid NOT NULL REFERENCES peskids.form_deliveries(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES peskids.form_templates(id) ON DELETE CASCADE,
  response_data jsonb NOT NULL,
  ip_address text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  crm_synced_at timestamptz,
  crm_sync_status text DEFAULT 'pending' CHECK (crm_sync_status IN ('pending', 'synced', 'failed')),
  crm_contact_id text,
  trial_class_scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_responses_tenant_delivery
  ON peskids.form_responses (tenant_slug, delivery_id);

CREATE INDEX IF NOT EXISTS idx_form_responses_crm_sync
  ON peskids.form_responses (tenant_slug, crm_sync_status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_responses_submitted
  ON peskids.form_responses (tenant_slug, submitted_at DESC);

-- Enable RLS
ALTER TABLE peskids.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.form_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE peskids.form_responses ENABLE ROW LEVEL SECURITY;

-- Service role can access everything
DROP POLICY IF EXISTS "service_role_all_form_templates" ON peskids.form_templates;
CREATE POLICY "service_role_all_form_templates"
  ON peskids.form_templates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_form_deliveries" ON peskids.form_deliveries;
CREATE POLICY "service_role_all_form_deliveries"
  ON peskids.form_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_form_responses" ON peskids.form_responses;
CREATE POLICY "service_role_all_form_responses"
  ON peskids.form_responses
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.form_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.form_deliveries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON peskids.form_responses TO service_role;

-- Add comments
COMMENT ON TABLE peskids.form_templates IS
  'Email form templates for collecting family data before CRM/platform access';

COMMENT ON TABLE peskids.form_deliveries IS
  'Track form delivery to families (email, SMS, WhatsApp)';

COMMENT ON TABLE peskids.form_responses IS
  'Family form responses - synced to CRM and used to schedule trial classes';

COMMIT;
