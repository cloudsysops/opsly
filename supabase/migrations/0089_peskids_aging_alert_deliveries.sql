-- PR-PRO-5: idempotency log for 24h/48h lead aging + overdue/trial alerts.
-- Additive only; never blocks lead capture.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.peskids_aging_alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids' REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  alert_kind text NOT NULL
    CHECK (alert_kind IN (
      'lead_reminder_24h',
      'lead_escalation_48h',
      'followup_overdue',
      'trial_unconfirmed'
    )),
  entity_type text NOT NULL
    CHECK (entity_type IN ('lead', 'followup', 'trial')),
  entity_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT peskids_aging_alert_deliveries_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_peskids_aging_alert_deliveries_entity
  ON platform.peskids_aging_alert_deliveries (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_peskids_aging_alert_deliveries_tenant_kind
  ON platform.peskids_aging_alert_deliveries (tenant_slug, alert_kind, created_at DESC);

ALTER TABLE platform.peskids_aging_alert_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_peskids_aging_alert_deliveries"
  ON platform.peskids_aging_alert_deliveries;
CREATE POLICY "service_role_all_peskids_aging_alert_deliveries"
  ON platform.peskids_aging_alert_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.peskids_aging_alert_deliveries TO service_role;

COMMIT;
