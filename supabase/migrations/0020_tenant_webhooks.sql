-- Migration 0020: tenant webhooks
-- Webhooks outbound por tenant con firma HMAC-SHA256

CREATE TABLE IF NOT EXISTS platform.tenant_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug   TEXT NOT NULL REFERENCES platform.tenants(slug) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  secret        TEXT NOT NULL,               -- HMAC-SHA256 signing secret
  events        TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'tenant.created','billing.paid'}
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_slug
  ON platform.tenant_webhooks (tenant_slug);

CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_active
  ON platform.tenant_webhooks (tenant_slug, active)
  WHERE active = TRUE;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION platform.set_webhook_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_webhook_updated_at ON platform.tenant_webhooks;
CREATE TRIGGER trg_webhook_updated_at
  BEFORE UPDATE ON platform.tenant_webhooks
  FOR EACH ROW EXECUTE FUNCTION platform.set_webhook_updated_at();

-- RLS
ALTER TABLE platform.tenant_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on tenant_webhooks"
  ON platform.tenant_webhooks
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_webhooks TO service_role;
GRANT USAGE ON SCHEMA platform TO service_role;
