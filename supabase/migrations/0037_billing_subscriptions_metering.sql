-- Phase 3a.2: Billing subscriptions, plans, metering events, stripe sync logs

-- ─── Billing Plans (master data) ─────────────────────────────
CREATE TABLE platform.billing_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  monthly_price_cents bigint NOT NULL DEFAULT 0,
  yearly_price_cents bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'COP',
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO platform.billing_plans (id, name, description, monthly_price_cents, yearly_price_cents, features)
VALUES
  ('opsly-basic', 'Opsly Basic', 'n8n + Uptime Kuma básico', 4900000, 49000000, '{"n8n_workflows": 10, "uptime_kuma_monitors": 5}'),
  ('opsly-pro', 'Opsly Pro', 'n8n + Uptime Kuma + LLM Gateway', 14900000, 149000000, '{"n8n_workflows": 100, "uptime_kuma_monitors": 50, "llm_gateway": true}'),
  ('opsly-enterprise', 'Opsly Enterprise', 'Todo ilimitado + soporte dedicado', 49900000, 499000000, '{"n8n_workflows": -1, "uptime_kuma_monitors": -1, "llm_gateway": true, "dedicated_support": true}');

-- ─── Billing Subscriptions ───────────────────────────────────
CREATE TABLE platform.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,

  plan_id text NOT NULL REFERENCES platform.billing_plans (id),

  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,

  status text NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')
  ),

  billing_period text NOT NULL DEFAULT 'monthly' CHECK (
    billing_period IN ('monthly', 'yearly')
  ),

  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'COP',

  current_period_start date,
  current_period_end date,

  auto_renew boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,

  UNIQUE (tenant_id)
);

CREATE INDEX idx_billing_subs_tenant ON platform.billing_subscriptions (tenant_id);
CREATE INDEX idx_billing_subs_stripe ON platform.billing_subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_billing_subs_status ON platform.billing_subscriptions (status);

-- ─── Metering Events ─────────────────────────────────────────
CREATE TABLE platform.metering_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,

  metric_type text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),

  reported_at timestamptz NOT NULL DEFAULT now(),
  period_month date,

  metadata jsonb NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_metering_events_tenant ON platform.metering_events (tenant_id, reported_at DESC);
CREATE INDEX idx_metering_events_period ON platform.metering_events (tenant_id, metric_type, period_month);

-- ─── Metering Pricing ────────────────────────────────────────
CREATE TABLE platform.metering_pricing (
  id text PRIMARY KEY,
  metric_type text NOT NULL UNIQUE,
  unit_price_cents bigint NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default pricing
INSERT INTO platform.metering_pricing (id, metric_type, unit_price_cents, description)
VALUES
  ('n8n_executions', 'n8n_executions', 500, 'Ejecución de workflow n8n'),
  ('llm_calls', 'llm_calls', 2000, 'Llamada a LLM Gateway'),
  ('uptime_checks', 'uptime_checks', 100, 'Check de Uptime Kuma'),
  ('cases_processed', 'cases_processed', 7500000, 'Caso procesado (LegalVial)');

-- ─── Stripe Sync Logs ────────────────────────────────────────
CREATE TABLE platform.stripe_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  stripe_object_id text,
  tenant_id uuid REFERENCES platform.tenants (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'success' CHECK (
    status IN ('success', 'failed', 'skipped')
  ),
  error_message text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stripe_sync_tenant ON platform.stripe_sync_logs (tenant_id, synced_at DESC);

-- ─── Auto-update timestamps ──────────────────────────────────
CREATE TRIGGER billing_subs_updated_at
  BEFORE UPDATE ON platform.billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE platform.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.metering_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.metering_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.stripe_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full" ON platform.billing_plans USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON platform.billing_subscriptions USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON platform.metering_events USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON platform.metering_pricing USING (auth.role() = 'service_role');
CREATE POLICY "service_role_full" ON platform.stripe_sync_logs USING (auth.role() = 'service_role');

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.billing_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.billing_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.metering_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.metering_pricing TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.stripe_sync_logs TO service_role;
