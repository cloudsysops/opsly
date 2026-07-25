-- Franchise Payment System
-- Enables revenue sharing between Peskids and franchises via Stripe and Wompi

-- ========================
-- Payment Provider Configuration
-- ========================

CREATE TABLE IF NOT EXISTS platform.franchise_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  payment_provider VARCHAR(20) NOT NULL CHECK (payment_provider IN ('stripe', 'wompi')),

  -- Stripe Connected Account
  stripe_connected_account_id TEXT,
  stripe_api_key TEXT,

  -- Wompi Configuration
  wompi_api_key TEXT,
  wompi_public_key TEXT,
  wompi_private_key TEXT,

  -- Revenue Share Settings
  revenue_share_percentage DECIMAL(5,2) NOT NULL DEFAULT 20 CHECK (revenue_share_percentage >= 0 AND revenue_share_percentage <= 100),

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,

  CONSTRAINT unique_franchise_provider UNIQUE (franchise_tenant_id, payment_provider)
);

CREATE INDEX idx_franchise_payment_config_tenant ON platform.franchise_payment_config(franchise_tenant_id);
CREATE INDEX idx_franchise_payment_config_provider ON platform.franchise_payment_config(payment_provider);
CREATE INDEX idx_franchise_payment_config_active ON platform.franchise_payment_config(is_active);

-- ========================
-- Revenue Tracking
-- ========================

CREATE TABLE IF NOT EXISTS platform.franchise_revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE RESTRICT,

  -- Transaction identifiers
  transaction_id TEXT NOT NULL UNIQUE, -- Payment gateway transaction ID
  payment_provider VARCHAR(20) NOT NULL CHECK (payment_provider IN ('stripe', 'wompi')),

  -- Amount breakdown (all in cents)
  gross_amount_cents INTEGER NOT NULL CHECK (gross_amount_cents > 0),
  franchise_net_cents INTEGER NOT NULL CHECK (franchise_net_cents >= 0),
  peskids_share_cents INTEGER NOT NULL CHECK (peskids_share_cents >= 0),
  revenue_share_percentage DECIMAL(5,2) NOT NULL,

  -- Transaction references
  order_id UUID,
  student_id UUID,

  -- Payment status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'failed', 'cancelled')),

  -- Payout tracking
  peskids_payout_id TEXT,
  peskids_payout_date TIMESTAMPTZ,

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT amount_consistency CHECK (gross_amount_cents = franchise_net_cents + peskids_share_cents)
);

CREATE INDEX idx_franchise_revenue_tracking_tenant ON platform.franchise_revenue_tracking(franchise_tenant_id);
CREATE INDEX idx_franchise_revenue_tracking_status ON platform.franchise_revenue_tracking(status);
CREATE INDEX idx_franchise_revenue_tracking_provider ON platform.franchise_revenue_tracking(payment_provider);
CREATE INDEX idx_franchise_revenue_tracking_date ON platform.franchise_revenue_tracking(created_at DESC);
CREATE INDEX idx_franchise_revenue_tracking_payout ON platform.franchise_revenue_tracking(peskids_payout_date) WHERE peskids_payout_date IS NOT NULL;

-- ========================
-- Revenue Summary (Materialized View for Dashboards)
-- ========================

CREATE TABLE IF NOT EXISTS platform.franchise_revenue_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,

  -- Period tracking
  period_date DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'quarter', 'year')),

  -- Aggregated metrics
  transaction_count INTEGER NOT NULL DEFAULT 0,
  gross_revenue_cents INTEGER NOT NULL DEFAULT 0,
  peskids_share_cents INTEGER NOT NULL DEFAULT 0,
  franchise_net_cents INTEGER NOT NULL DEFAULT 0,
  avg_revenue_share_percentage DECIMAL(5,2),

  -- By payment method
  stripe_transaction_count INTEGER DEFAULT 0,
  stripe_gross_cents INTEGER DEFAULT 0,
  wompi_transaction_count INTEGER DEFAULT 0,
  wompi_gross_cents INTEGER DEFAULT 0,

  -- Audit trail
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(franchise_tenant_id, period_date, period_type)
);

CREATE INDEX idx_franchise_revenue_summary_tenant ON platform.franchise_revenue_summary(franchise_tenant_id);
CREATE INDEX idx_franchise_revenue_summary_period ON platform.franchise_revenue_summary(period_date DESC);

-- ========================
-- RLS Policies
-- ========================

-- Franchises can only see their own revenue tracking
CREATE POLICY franchise_revenue_tracking_select ON platform.franchise_revenue_tracking
  FOR SELECT
  USING (
    franchise_tenant_id = (
      SELECT id FROM platform.tenants
      WHERE tenant_slug = current_setting('auth.tenant_slug', true)::TEXT
    )
  );

-- Only superadmin (Peskids) can insert/update revenue tracking
CREATE POLICY franchise_revenue_tracking_insert ON platform.franchise_revenue_tracking
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'is_superuser' = 'true'
  );

-- Franchise payment config is read-only for franchises, editable by superadmin
CREATE POLICY franchise_payment_config_select ON platform.franchise_payment_config
  FOR SELECT
  USING (
    franchise_tenant_id = (
      SELECT id FROM platform.tenants
      WHERE tenant_slug = current_setting('auth.tenant_slug', true)::TEXT
    )
    OR auth.jwt() ->> 'is_superuser' = 'true'
  );

CREATE POLICY franchise_payment_config_update ON platform.franchise_payment_config
  FOR UPDATE
  USING (auth.jwt() ->> 'is_superuser' = 'true')
  WITH CHECK (auth.jwt() ->> 'is_superuser' = 'true');

-- Summary accessible to franchises and superadmin
CREATE POLICY franchise_revenue_summary_select ON platform.franchise_revenue_summary
  FOR SELECT
  USING (
    franchise_tenant_id = (
      SELECT id FROM platform.tenants
      WHERE tenant_slug = current_setting('auth.tenant_slug', true)::TEXT
    )
    OR auth.jwt() ->> 'is_superuser' = 'true'
  );
