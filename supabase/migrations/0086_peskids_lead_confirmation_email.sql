-- PR-PRO-2: delivery log for Peskids lead confirmation emails (idempotent).
-- Additive only; does not alter platform.peskids_leads columns.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.peskids_lead_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids' REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES platform.peskids_leads (id) ON DELETE CASCADE,
  email_type text NOT NULL DEFAULT 'lead_confirmation'
    CHECK (email_type IN ('lead_confirmation')),
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  to_email text NOT NULL,
  provider_message_id text,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT peskids_lead_email_deliveries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_peskids_lead_email_deliveries_lead
  ON platform.peskids_lead_email_deliveries (lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_peskids_lead_email_deliveries_tenant_status
  ON platform.peskids_lead_email_deliveries (tenant_slug, status, created_at DESC);

ALTER TABLE platform.peskids_lead_email_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_peskids_lead_email_deliveries"
  ON platform.peskids_lead_email_deliveries;
CREATE POLICY "service_role_all_peskids_lead_email_deliveries"
  ON platform.peskids_lead_email_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.peskids_lead_email_deliveries TO service_role;

COMMIT;
