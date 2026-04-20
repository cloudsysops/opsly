-- Atribución de uso LLM para billing / analytics (user, feature, metadata JSON)
ALTER TABLE platform.usage_events
  ADD COLUMN IF NOT EXISTS user_id text,
  ADD COLUMN IF NOT EXISTS feature text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_feature_created
  ON platform.usage_events (tenant_slug, feature, created_at DESC);

COMMENT ON COLUMN platform.usage_events.user_id IS 'Usuario final opcional (portal / app tenant) para desglose de coste';
COMMENT ON COLUMN platform.usage_events.feature IS 'Área de producto opcional, ej. legal_analysis, classification';
COMMENT ON COLUMN platform.usage_events.metadata IS 'Metadatos no sensibles adicionales (JSON)';
