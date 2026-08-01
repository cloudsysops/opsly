-- Tenant module activation tracking — apps/admin drives bootstrap_script/smoke_script
-- execution from apps/api; this table is the status record apps/admin polls.
BEGIN;

CREATE TABLE IF NOT EXISTS platform.tenant_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  module_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'provisioning', 'active', 'active_needs_manual_steps', 'failed', 'disabled')),
  last_error text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_modules_tenant_module_unique UNIQUE (tenant_slug, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant
  ON platform.tenant_modules (tenant_slug);

ALTER TABLE platform.tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_tenant_modules" ON platform.tenant_modules;
CREATE POLICY "service_role_all_tenant_modules"
  ON platform.tenant_modules
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_modules TO service_role;

COMMIT;
