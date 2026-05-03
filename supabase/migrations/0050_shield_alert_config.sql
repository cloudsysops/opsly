-- Renumbered from 0042: remote already had 0042 (n8n_marketplace_installs); one version per prefix.
-- Opsly Shield / Guardian Grid — alert configuration per tenant (Phase 2 MVP)
-- Uptime Kuma + defensive alerts (Discord webhook outbound)

CREATE TABLE IF NOT EXISTS platform.shield_alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL REFERENCES platform.tenants (slug) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (
    alert_type IN (
      'phishing',
      'dominio_falso',
      'endpoint_caido',
      'abuse_api',
      'costo_anormal'
    )
  ),
  webhook_url text,
  threshold jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shield_alert_config_tenant_type_unique UNIQUE (tenant_slug, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_shield_alert_config_tenant
  ON platform.shield_alert_config (tenant_slug);

CREATE INDEX IF NOT EXISTS idx_shield_alert_config_enabled
  ON platform.shield_alert_config (tenant_slug, enabled)
  WHERE enabled = true;

ALTER TABLE platform.shield_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on shield_alert_config"
  ON platform.shield_alert_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.shield_alert_config TO service_role;
