-- Local Services (Equipa) — Phase 1 core tables (tenant_slug → platform.tenants)

CREATE TABLE IF NOT EXISTS platform.ls_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform.ls_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ls_customers_tenant_email_unique UNIQUE (tenant_slug, email)
);

CREATE INDEX IF NOT EXISTS idx_ls_customers_tenant ON platform.ls_customers (tenant_slug);

CREATE TABLE IF NOT EXISTS platform.ls_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  customer_id uuid REFERENCES platform.ls_customers (id) ON DELETE SET NULL,
  service_id uuid REFERENCES platform.ls_services (id) ON DELETE SET NULL,
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ls_bookings_tenant ON platform.ls_bookings (tenant_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS platform.ls_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  customer_id uuid REFERENCES platform.ls_customers (id) ON DELETE SET NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ls_quotes_tenant ON platform.ls_quotes (tenant_slug);

CREATE TABLE IF NOT EXISTS platform.ls_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  title text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ls_reports_tenant ON platform.ls_reports (tenant_slug, created_at DESC);

-- RLS: API uses service_role; no anon policies (public booking via API only)
ALTER TABLE platform.ls_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ls_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ls_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ls_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ls_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ls_services"
  ON platform.ls_services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ls_customers"
  ON platform.ls_customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ls_bookings"
  ON platform.ls_bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ls_quotes"
  ON platform.ls_quotes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ls_reports"
  ON platform.ls_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_services TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_bookings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_quotes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ls_reports TO service_role;
