-- Tenant identities: human memberships + non-human service accounts.
-- Keeps `platform.tenants.owner_email` as a compatibility fallback while the portal
-- moves toward role-based tenant access.

CREATE TABLE IF NOT EXISTS platform.tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  email text NOT NULL CHECK (position('@' in email) > 1),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'disabled')),
  invited_by text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_memberships_tenant_email
  ON platform.tenant_memberships(tenant_id, lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_memberships_tenant_user
  ON platform.tenant_memberships(tenant_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_email
  ON platform.tenant_memberships(lower(email));

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_role
  ON platform.tenant_memberships(tenant_id, role)
  WHERE status = 'active';

INSERT INTO platform.tenant_memberships (tenant_id, email, role, status, metadata)
SELECT
  t.id,
  lower(t.owner_email),
  'owner',
  'active',
  jsonb_build_object('source', 'owner_email_backfill')
FROM platform.tenants t
WHERE t.deleted_at IS NULL
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS platform.tenant_service_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 80),
  kind text NOT NULL DEFAULT 'agent' CHECK (kind IN ('agent', 'mcp_tool', 'integration')),
  agent_role text CHECK (
    agent_role IS NULL OR agent_role IN ('planner', 'executor', 'tool', 'notifier')
  ),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'rotated')),
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata jsonb NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_service_accounts_tenant_status
  ON platform.tenant_service_accounts(tenant_id, status);

CREATE OR REPLACE FUNCTION platform.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_memberships_updated_at ON platform.tenant_memberships;
CREATE TRIGGER tenant_memberships_updated_at
  BEFORE UPDATE ON platform.tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

DROP TRIGGER IF EXISTS tenant_service_accounts_updated_at ON platform.tenant_service_accounts;
CREATE TRIGGER tenant_service_accounts_updated_at
  BEFORE UPDATE ON platform.tenant_service_accounts
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_service_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_tenant_memberships"
  ON platform.tenant_memberships FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_tenant_service_accounts"
  ON platform.tenant_service_accounts FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_memberships TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_service_accounts TO service_role;
