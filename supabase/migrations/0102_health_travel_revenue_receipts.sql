-- Health Travel Revenue event receipts.
-- Adds transport idempotency/reconciliation state on top of Revenue Core 0101.
-- No clinical data. No payment execution. No money movement.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.revenue_event_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  source_system text NOT NULL,
  external_event_id text NOT NULL,
  dedupe_key text,
  event_type text NOT NULL CHECK (event_type IN (
    'health.lead.created',
    'health.consultation.scheduled',
    'health.quote.sent',
    'health.booking.started',
    'health.deposit.paid',
    'health.consultation.completed',
    'health.journey.completed'
  )),
  lead_ref text NOT NULL,
  provider_ref text,
  offer_ref text,
  attribution_id uuid REFERENCES platform.revenue_attributions(id) ON DELETE SET NULL,
  referral_id uuid REFERENCES platform.revenue_referrals(id) ON DELETE SET NULL,
  commission_event_id uuid REFERENCES platform.revenue_commission_events(id) ON DELETE SET NULL,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN (
    'received','applied','reconciliation_required','ignored','failed'
  )),
  error_code text,
  occurred_at timestamptz NOT NULL,
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_system, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_revenue_event_receipts_tenant_status
  ON platform.revenue_event_receipts(tenant_id, processing_status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_event_receipts_lead
  ON platform.revenue_event_receipts(tenant_id, lead_ref, occurred_at DESC);

DROP TRIGGER IF EXISTS revenue_event_receipts_updated_at
  ON platform.revenue_event_receipts;
CREATE TRIGGER revenue_event_receipts_updated_at
  BEFORE UPDATE ON platform.revenue_event_receipts
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.revenue_event_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_revenue_event_receipts
  ON platform.revenue_event_receipts;
CREATE POLICY service_role_all_revenue_event_receipts
  ON platform.revenue_event_receipts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON platform.revenue_event_receipts TO service_role;

COMMIT;
