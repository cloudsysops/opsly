-- Presupuestos configurables por tenant (cost caps IA).
-- Permite que cada tenant establezca un límite mensual personalizado
-- en USD y un umbral de alerta, sobreescribiendo los defaults del plan.
CREATE TABLE IF NOT EXISTS platform.tenant_budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug text NOT NULL UNIQUE,
  monthly_cap_usd numeric(10, 2) NOT NULL CHECK (monthly_cap_usd > 0),
  alert_threshold_pct int NOT NULL DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_tenant_budgets_slug FOREIGN KEY (tenant_slug)
    REFERENCES platform.tenants (slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tenant_budgets_slug ON platform.tenant_budgets (tenant_slug);

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION platform.set_tenant_budgets_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_budgets_updated_at
  BEFORE UPDATE ON platform.tenant_budgets
  FOR EACH ROW EXECUTE FUNCTION platform.set_tenant_budgets_updated_at();

-- RLS: sólo service_role puede modificar; autenticados leen la propia fila
ALTER TABLE platform.tenant_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON platform.tenant_budgets
  TO service_role USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA platform TO authenticated, anon;
GRANT SELECT ON platform.tenant_budgets TO authenticated;
