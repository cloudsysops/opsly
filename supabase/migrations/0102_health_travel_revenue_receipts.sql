-- Health Travel Revenue event receipts.
-- Adds transport idempotency/reconciliation state on top of Revenue Core 0101.
-- No clinical data. No payment execution. No money movement.

BEGIN;

-- Composite tenant/id keys allow receipt references to be tenant-safe at the DB boundary.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revenue_attributions_tenant_id_id_key'
      AND conrelid = 'platform.revenue_attributions'::regclass
  ) THEN
    ALTER TABLE platform.revenue_attributions
      ADD CONSTRAINT revenue_attributions_tenant_id_id_key UNIQUE (tenant_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revenue_referrals_tenant_id_id_key'
      AND conrelid = 'platform.revenue_referrals'::regclass
  ) THEN
    ALTER TABLE platform.revenue_referrals
      ADD CONSTRAINT revenue_referrals_tenant_id_id_key UNIQUE (tenant_id, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'revenue_commission_events_tenant_id_id_key'
      AND conrelid = 'platform.revenue_commission_events'::regclass
  ) THEN
    ALTER TABLE platform.revenue_commission_events
      ADD CONSTRAINT revenue_commission_events_tenant_id_id_key UNIQUE (tenant_id, id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS platform.revenue_event_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  source_system text NOT NULL,
  external_event_id text NOT NULL,
  business_dedupe_key text,
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
  lead_ref text NOT NULL CHECK (btrim(lead_ref) <> ''),
  provider_ref text,
  offer_ref text,
  payment_ref text,
  attribution_id uuid,
  referral_id uuid,
  commission_event_id uuid,
  processing_status text NOT NULL DEFAULT 'received' CHECK (processing_status IN (
    'received','processing','applied','reconciliation_required','ignored','failed'
  )),
  claim_token uuid,
  processing_started_at timestamptz,
  error_code text,
  occurred_at timestamptz NOT NULL,
  processed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_system, external_event_id),
  CONSTRAINT revenue_event_receipts_attribution_tenant_fk
    FOREIGN KEY (tenant_id, attribution_id)
    REFERENCES platform.revenue_attributions(tenant_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT revenue_event_receipts_referral_tenant_fk
    FOREIGN KEY (tenant_id, referral_id)
    REFERENCES platform.revenue_referrals(tenant_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT revenue_event_receipts_commission_tenant_fk
    FOREIGN KEY (tenant_id, commission_event_id)
    REFERENCES platform.revenue_commission_events(tenant_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_event_receipts_business_dedupe
  ON platform.revenue_event_receipts(tenant_id, source_system, business_dedupe_key)
  WHERE business_dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_event_receipts_tenant_status
  ON platform.revenue_event_receipts(tenant_id, processing_status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_event_receipts_lead
  ON platform.revenue_event_receipts(tenant_id, lead_ref, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_event_receipts_processing_lease
  ON platform.revenue_event_receipts(tenant_id, processing_status, processing_started_at)
  WHERE processing_status = 'processing';

-- Commission external_ref is a business idempotency key:
-- * flat model => one key per referral
-- * percentage-on-deposit => one key per stable payment identity
CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_commission_event_external_source
  ON platform.revenue_commission_events(tenant_id, referral_id, source, external_ref)
  WHERE source = 'smile-trip-care' AND external_ref IS NOT NULL;

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
