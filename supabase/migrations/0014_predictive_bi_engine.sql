-- Migration: 0014_predictive_bi_engine.sql
-- Capa 2: Predictive Business Intelligence Engine
-- Tables: tenant_insights, ml_model_snapshots

BEGIN;

-- ============================================
-- Tabla: tenant_insights
-- Almacena predicciones generadas por Hermes
-- ============================================
CREATE TABLE IF NOT EXISTS platform.tenant_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL CHECK (insight_type IN (
        'churn_risk',
        'revenue_forecast',
        'anomaly_detection',
        'usage_pattern',
        'cost_optimization',
        'growth_opportunity'
    )),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    impact_score INTEGER NOT NULL CHECK (impact_score >= 1 AND impact_score <= 10) DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'read', 'actioned', 'dismissed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    -- Índices para consultas eficientes
    CONSTRAINT tenant_insights_tenant_type_unique UNIQUE (tenant_id, insight_type, created_at)
);

-- Índices optimizados
CREATE INDEX idx_tenant_insights_tenant_id ON platform.tenant_insights(tenant_id);
CREATE INDEX idx_tenant_insights_type ON platform.tenant_insights(insight_type);
CREATE INDEX idx_tenant_insights_status ON platform.tenant_insights(status) WHERE status = 'active';
CREATE INDEX idx_tenant_insights_created_at ON platform.tenant_insights(created_at DESC);
CREATE INDEX idx_tenant_insights_confidence ON platform.tenant_insights(confidence DESC) WHERE status = 'active';
CREATE INDEX idx_tenant_insights_expires ON platform.tenant_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_insights_updated_at
    BEFORE UPDATE ON platform.tenant_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Tabla: ml_model_snapshots
-- Versiones de modelos/configuraciones heurísticas
-- ============================================
CREATE TABLE IF NOT EXISTS platform.ml_model_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    model_type TEXT NOT NULL CHECK (model_type IN ('heuristic', 'statistical', 'ml')),
    config JSONB NOT NULL DEFAULT '{}',
    weights JSONB,
    metrics JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    
    CONSTRAINT ml_model_snapshots_name_version_unique UNIQUE (model_name, model_version)
);

-- Índices
CREATE INDEX idx_ml_snapshots_active ON platform.ml_model_snapshots(model_name) WHERE is_active = true;
CREATE INDEX idx_ml_snapshots_created ON platform.ml_model_snapshots(created_at DESC);

-- ============================================
-- Tabla: insight_events
-- Log de eventos para análisis de tendencias
-- ============================================
CREATE TABLE IF NOT EXISTS platform.insight_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES platform.tenants(id) ON DELETE CASCADE,
    insight_id UUID REFERENCES platform.tenant_insights(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'generated',
        'viewed',
        'actioned',
        'dismissed',
        'feedback_positive',
        'feedback_negative'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_insight_events_tenant ON platform.insight_events(tenant_id);
CREATE INDEX idx_insight_events_insight ON platform.insight_events(insight_id);
CREATE INDEX idx_insight_events_type ON platform.insight_events(event_type);
CREATE INDEX idx_insight_events_created ON platform.insight_events(created_at DESC);

-- ============================================
-- Función: Cleanup de insights expirados
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_insights()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM platform.tenant_insights
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Función: Obtener insights activos por tenant
-- ============================================
CREATE OR REPLACE FUNCTION get_active_insights(p_tenant_id UUID)
RETURNS TABLE (
    id UUID,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    confidence DECIMAL,
    impact_score INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        ti.insight_type,
        ti.title,
        ti.description,
        ti.confidence,
        ti.impact_score,
        ti.created_at
    FROM platform.tenant_insights ti
    WHERE ti.tenant_id = p_tenant_id
      AND ti.status = 'active'
      AND (ti.expires_at IS NULL OR ti.expires_at > NOW())
    ORDER BY ti.impact_score DESC, ti.confidence DESC, ti.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE platform.tenant_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.ml_model_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.insight_events ENABLE ROW LEVEL SECURITY;

-- Tenant puede ver sus propios insights
CREATE POLICY tenant_insights_select ON platform.tenant_insights
    FOR SELECT USING (
        tenant_id IN (
            SELECT t.id FROM platform.tenants t
            WHERE t.owner_id = auth.uid()
        )
    );

CREATE POLICY tenant_insights_insert ON platform.tenant_insights
    FOR INSERT WITH CHECK (true);

CREATE POLICY tenant_insights_update ON platform.tenant_insights
    FOR UPDATE USING (
        tenant_id IN (
            SELECT t.id FROM platform.tenants t
            WHERE t.owner_id = auth.uid()
        )
    );

-- Model snapshots son solo lectura para tenants
CREATE POLICY ml_snapshots_select ON platform.ml_model_snapshots
    FOR SELECT USING (true);

-- Events son solo para el tenant
CREATE POLICY insight_events_insert ON platform.insight_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY insight_events_select ON platform.insight_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT t.id FROM platform.tenants t
            WHERE t.owner_id = auth.uid()
        )
    );

COMMIT;

-- ============================================
-- Comentarios para documentación
-- ============================================
COMMENT ON TABLE platform.tenant_insights IS 'Predicciones e insights generados por Hermes para cada tenant';
COMMENT ON TABLE platform.ml_model_snapshots IS 'Versiones de modelos heurísticos/estadísticos usados para predicciones';
COMMENT ON TABLE platform.insight_events IS 'Log de interacciones con insights para feedback loop';
COMMENT ON COLUMN platform.tenant_insights.payload IS 'JSON con datos específicos del insight: {metric_value, threshold, trend, etc}';
COMMENT ON COLUMN platform.tenant_insights.confidence IS 'Nivel de confianza de 0 a 1 (ej: 0.85 = 85%)';
COMMENT ON COLUMN platform.tenant_insights.impact_score IS 'Impacto potencial en el negocio de 1 a 10';
