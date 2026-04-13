-- Predictive BI (Capa 2): insights por tenant. Solo service_role en runtime; RLS sin políticas públicas.

CREATE TABLE IF NOT EXISTS platform.tenant_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(6, 5) NOT NULL DEFAULT 0 CHECK (
    confidence >= 0
    AND confidence <= 1
  ),
  impact_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'dismissed', 'actioned')
  ),
  read_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_insights_tenant_created
  ON platform.tenant_insights (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_insights_tenant_status
  ON platform.tenant_insights (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_insights_type
  ON platform.tenant_insights (tenant_id, insight_type, created_at DESC);

COMMENT ON TABLE platform.tenant_insights IS 'Insights heurísticos/ML (churn, forecast, anomalías); un tenant no lee filas de otro.';

-- Opcional MVP: snapshots de configuración de modelos (pesos JSON, versión).
CREATE TABLE IF NOT EXISTS platform.ml_model_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES platform.tenants (id) ON DELETE CASCADE,
  model_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_snapshots_tenant_key
  ON platform.ml_model_snapshots (tenant_id, model_key, created_at DESC);

ALTER TABLE platform.tenant_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ml_model_snapshots ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON platform.tenant_insights TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.ml_model_snapshots TO service_role;
