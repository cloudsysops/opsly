-- Tabla de eventos de uso para observabilidad por tenant
CREATE TABLE IF NOT EXISTS platform.usage_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug text NOT NULL,
  model text NOT NULL,
  tokens_input integer NOT NULL DEFAULT 0,
  tokens_output integer NOT NULL DEFAULT 0,
  cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  cache_hit boolean NOT NULL DEFAULT false,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_usage_tenant_date
  ON platform.usage_events(tenant_slug, created_at DESC);

GRANT INSERT, SELECT ON platform.usage_events TO service_role;
