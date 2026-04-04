CREATE TABLE platform.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  key_hash text UNIQUE NOT NULL,
  key_prefix text NOT NULL,
  name text,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);
ALTER TABLE platform.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON platform.api_keys USING (auth.role() = 'service_role');