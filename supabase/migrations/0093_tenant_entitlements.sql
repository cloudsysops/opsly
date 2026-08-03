-- Tenant profile fields the platform.tenants CRUD (apps/api/app/api/tenants)
-- never had: domain/locale/currency/timezone/branding. And a real
-- entitlements table — until now the only "which modules can this tenant
-- use" mechanism was per-app hardcoded .env booleans (e.g.
-- PESKIDS_STAFF_IMPROVEMENT_CHAT_ENABLED), with zero central enforcement.
-- module_id is free text validated at the app layer against
-- config/commercial-catalog.json's modules[].id — not a DB-level FK,
-- since the catalog is a JSON file, not a table.

ALTER TABLE platform.tenants
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-US',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS branding_logo_url text;

CREATE TABLE IF NOT EXISTS platform.tenant_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  module_id text NOT NULL CHECK (module_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'plan_default', 'package_default')),
  granted_by text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_entitlements_tenant_enabled
  ON platform.tenant_entitlements(tenant_id, enabled);

-- Reuses platform.set_updated_at(), first defined in 0036_billing_invoices.sql
-- (also re-declared in 0047_tenant_memberships_and_service_accounts.sql via
-- CREATE OR REPLACE — same function either way).
DROP TRIGGER IF EXISTS tenant_entitlements_updated_at ON platform.tenant_entitlements;
CREATE TRIGGER tenant_entitlements_updated_at
  BEFORE UPDATE ON platform.tenant_entitlements
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.tenant_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_tenant_entitlements"
  ON platform.tenant_entitlements FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_entitlements TO service_role;
