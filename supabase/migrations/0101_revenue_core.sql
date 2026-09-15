-- Opsly Revenue Core
-- Tenant-safe attribution/referral/commission ledger.
-- No money movement. No payment execution. This migration only records commercial facts.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.revenue_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  external_ref text,
  name text NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN (
    'merchant','service_provider','health_provider','travel_provider',
    'contractor','affiliate_network','software_partner','other'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('prospect','active','paused','disabled')),
  website_url text,
  country_code text CHECK (country_code IS NULL OR char_length(country_code) = 2),
  default_currency text NOT NULL DEFAULT 'USD' CHECK (char_length(default_currency) = 3),
  commission_terms jsonb NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, external_ref)
);

CREATE TABLE IF NOT EXISTS platform.revenue_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES platform.revenue_partners(id) ON DELETE CASCADE,
  external_ref text,
  name text NOT NULL,
  offer_type text NOT NULL DEFAULT 'service' CHECK (offer_type IN (
    'service','product','travel','health','software','lead','other'
  )),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','expired')),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  price_amount numeric(18,2),
  commission_model text NOT NULL DEFAULT 'manual' CHECK (commission_model IN (
    'manual','flat','percentage','tiered'
  )),
  commission_value numeric(18,4),
  destination_url text,
  valid_from timestamptz,
  valid_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, partner_id, external_ref)
);

CREATE TABLE IF NOT EXISTS platform.revenue_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES platform.revenue_partners(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES platform.revenue_offers(id) ON DELETE SET NULL,
  attribution_key text NOT NULL,
  source text NOT NULL,
  campaign text,
  channel text,
  agent_task_request_id text,
  click_ref text,
  lead_ref text,
  opportunity_ref text,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  last_touch_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, attribution_key)
);

CREATE TABLE IF NOT EXISTS platform.revenue_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  attribution_id uuid REFERENCES platform.revenue_attributions(id) ON DELETE SET NULL,
  partner_id uuid NOT NULL REFERENCES platform.revenue_partners(id) ON DELETE RESTRICT,
  offer_id uuid REFERENCES platform.revenue_offers(id) ON DELETE SET NULL,
  external_ref text,
  status text NOT NULL DEFAULT 'referred' CHECK (status IN (
    'referred','qualified','quoted','booked','converted','lost','cancelled'
  )),
  customer_ref text,
  opportunity_ref text,
  gross_value numeric(18,2),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  converted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, partner_id, external_ref)
);

CREATE TABLE IF NOT EXISTS platform.revenue_commission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  referral_id uuid NOT NULL REFERENCES platform.revenue_referrals(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES platform.revenue_partners(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'estimated','confirmed','adjusted','reversed','paid'
  )),
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  source text NOT NULL DEFAULT 'manual',
  external_ref text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.revenue_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES platform.revenue_partners(id) ON DELETE RESTRICT,
  payout_ref text,
  status text NOT NULL DEFAULT 'expected' CHECK (status IN (
    'expected','pending','received','disputed','cancelled'
  )),
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  expected_at timestamptz,
  received_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, partner_id, payout_ref)
);

CREATE INDEX IF NOT EXISTS idx_revenue_partners_tenant_status
  ON platform.revenue_partners(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_revenue_offers_tenant_partner_status
  ON platform.revenue_offers(tenant_id, partner_id, status);
CREATE INDEX IF NOT EXISTS idx_revenue_attributions_tenant_source
  ON platform.revenue_attributions(tenant_id, source, first_touch_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_attributions_agent_task
  ON platform.revenue_attributions(tenant_id, agent_task_request_id)
  WHERE agent_task_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_revenue_referrals_tenant_status
  ON platform.revenue_referrals(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_commissions_tenant_partner
  ON platform.revenue_commission_events(tenant_id, partner_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_payouts_tenant_status
  ON platform.revenue_payouts(tenant_id, status, expected_at);

DROP TRIGGER IF EXISTS revenue_partners_updated_at ON platform.revenue_partners;
CREATE TRIGGER revenue_partners_updated_at
  BEFORE UPDATE ON platform.revenue_partners
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS revenue_offers_updated_at ON platform.revenue_offers;
CREATE TRIGGER revenue_offers_updated_at
  BEFORE UPDATE ON platform.revenue_offers
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS revenue_referrals_updated_at ON platform.revenue_referrals;
CREATE TRIGGER revenue_referrals_updated_at
  BEFORE UPDATE ON platform.revenue_referrals
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS revenue_payouts_updated_at ON platform.revenue_payouts;
CREATE TRIGGER revenue_payouts_updated_at
  BEFORE UPDATE ON platform.revenue_payouts
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.revenue_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.revenue_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.revenue_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.revenue_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.revenue_commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.revenue_payouts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'revenue_partners','revenue_offers','revenue_attributions',
    'revenue_referrals','revenue_commission_events','revenue_payouts'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all_%I ON platform.%I', t, t);
    EXECUTE format(
      'CREATE POLICY service_role_all_%I ON platform.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON platform.%I TO service_role', t);
  END LOOP;
END $$;

COMMIT;
