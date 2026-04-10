-- Medición de uso (pay-as-you-go) y límites por tenant
-- billing_usage: línea de detalle por evento de consumo facturable
-- tenant_limits: cupos y estado de exceso por métrica / período
CREATE TABLE IF NOT EXISTS platform.billing_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (
    metric_type IN (
      'cpu_seconds',
      'ai_tokens',
      'storage_gb',
      'worker_seconds'
    )
  ),
  quantity numeric(20, 8) NOT NULL CHECK (quantity >= 0),
  unit_cost numeric(20, 8) NOT NULL CHECK (unit_cost >= 0),
  total_amount numeric(20, 8) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_billing_usage_tenant_recorded ON platform.billing_usage (tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_usage_metric ON platform.billing_usage (metric_type, recorded_at DESC);
CREATE TABLE IF NOT EXISTS platform.tenant_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (
    metric_type IN (
      'cpu_seconds',
      'ai_tokens',
      'storage_gb',
      'worker_seconds'
    )
  ),
  period_label text NOT NULL,
  quota_limit numeric(20, 8) NOT NULL CHECK (quota_limit >= 0),
  usage_current numeric(20, 8) NOT NULL DEFAULT 0 CHECK (usage_current >= 0),
  is_exceeded boolean NOT NULL DEFAULT false,
  exceeded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_limits_unique_period UNIQUE (tenant_id, metric_type, period_label)
);
CREATE INDEX IF NOT EXISTS idx_tenant_limits_tenant ON platform.tenant_limits (tenant_id);
ALTER TABLE platform.billing_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.tenant_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON platform.billing_usage USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON platform.tenant_limits USING (auth.role() = 'service_role');
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON platform.billing_usage TO service_role;
GRANT SELECT,
  INSERT,
  UPDATE,
  DELETE ON platform.tenant_limits TO service_role;