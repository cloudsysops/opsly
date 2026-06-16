-- Create metrics_log table for operational monitoring
-- Stores: lead volume, latency, error rates, system health

CREATE TABLE IF NOT EXISTS platform.metrics_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'histogram', 'gauge')),
  metric_value NUMERIC NOT NULL,
  component TEXT NOT NULL,
  tenant_slug TEXT NOT NULL DEFAULT 'system',
  tags JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_metrics_tenant_timestamp ON platform.metrics_log (tenant_slug, timestamp DESC);
CREATE INDEX idx_metrics_component_timestamp ON platform.metrics_log (component, timestamp DESC);
CREATE INDEX idx_metrics_metric_name ON platform.metrics_log (metric_name, timestamp DESC);

-- Comment
COMMENT ON TABLE platform.metrics_log IS 'Operational metrics for lead funnel visibility: volume, latency, errors';
COMMENT ON COLUMN platform.metrics_log.metric_name IS 'e.g., leads.received, ghl.contact.latency_ms, supabase.errors';
COMMENT ON COLUMN platform.metrics_log.metric_type IS 'counter (increments), histogram (latency), gauge (state)';
COMMENT ON COLUMN platform.metrics_log.component IS 'e.g., webhook-receiver, supabase, gohighlevel, n8n';
COMMENT ON COLUMN platform.metrics_log.tags IS 'Additional context: {statusCode: 429, operation: createContact}';

-- RLS: Allow authenticated users to read metrics
ALTER TABLE platform.metrics_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY metrics_log_read_all ON platform.metrics_log FOR SELECT
  USING (true);
