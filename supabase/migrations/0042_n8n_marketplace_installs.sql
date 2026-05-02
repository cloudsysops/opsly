-- Portal marketplace n8n: persistencia de activaciones + precio unitario para metering

CREATE TABLE IF NOT EXISTS platform.n8n_marketplace_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  catalog_item_id text NOT NULL,
  catalog_version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'activated' CHECK (status IN ('activated', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_n8n_marketplace_installs_tenant
  ON platform.n8n_marketplace_installs (tenant_id, created_at DESC);

CREATE TRIGGER n8n_marketplace_installs_updated_at
  BEFORE UPDATE ON platform.n8n_marketplace_installs
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

ALTER TABLE platform.n8n_marketplace_installs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_full"
    ON platform.n8n_marketplace_installs
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.n8n_marketplace_installs TO service_role;

INSERT INTO platform.metering_pricing (id, metric_type, unit_price_cents, description)
VALUES (
  'n8n_marketplace_pack_install',
  'n8n_marketplace_pack_install',
  990000,
  'Activación pack marketplace n8n (COP orientativo; ajustar en producto)'
)
ON CONFLICT (id) DO NOTHING;
