-- Local services core: catálogo de componentes, entornos, endpoints, sondas.
-- Alineado a GET /api/local/services (apps/api) — persistencia opcional para probes y bindings.

-- ─── 1. Definiciones canónicas de componente ───────────────────────────────

CREATE TABLE IF NOT EXISTS platform.local_service_definitions (
  id text PRIMARY KEY,
  label text NOT NULL,
  role text NOT NULL,
  default_health_path text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_service_definitions_sort
  ON platform.local_service_definitions (sort_order, id);

-- ─── 2. Entornos de despliegue (local, mac2011, staging, etc.) ──────────────

CREATE TABLE IF NOT EXISTS platform.local_service_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  display_name text NOT NULL,
  default_bind_host text NOT NULL DEFAULT '127.0.0.1',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_local_service_environments_slug UNIQUE (slug),
  CONSTRAINT chk_local_service_environments_slug
    CHECK (
      char_length(slug) BETWEEN 1 AND 64
      AND (
        slug ~ '^[a-z0-9]$'
        OR slug ~ '^[a-z0-9][a-z0-9_-]*[a-z0-9]$'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_local_service_environments_slug
  ON platform.local_service_environments (slug);

CREATE TRIGGER local_service_environments_updated_at
  BEFORE UPDATE ON platform.local_service_environments
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

-- ─── 3. Endpoints por entorno + componente ─────────────────────────────────

CREATE TABLE IF NOT EXISTS platform.local_service_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid NOT NULL
    REFERENCES platform.local_service_environments (id) ON DELETE CASCADE,
  component_id text NOT NULL
    REFERENCES platform.local_service_definitions (id) ON DELETE RESTRICT,
  base_url text NOT NULL,
  health_path_override text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_local_service_endpoints_env_component UNIQUE (environment_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_local_service_endpoints_environment
  ON platform.local_service_endpoints (environment_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_local_service_endpoints_component
  ON platform.local_service_endpoints (component_id);

CREATE TRIGGER local_service_endpoints_updated_at
  BEFORE UPDATE ON platform.local_service_endpoints
  FOR EACH ROW EXECUTE FUNCTION platform.set_updated_at();

-- ─── 4. Sesiones de sonda (batch) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform.local_service_probe_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id uuid
    REFERENCES platform.local_service_environments (id) ON DELETE SET NULL,
  tenant_id uuid
    REFERENCES platform.tenants (id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'api' CHECK (source IN ('api', 'cli', 'cron')),
  probe_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_service_probe_runs_created
  ON platform.local_service_probe_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_local_service_probe_runs_tenant
  ON platform.local_service_probe_runs (tenant_id, created_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_local_service_probe_runs_environment
  ON platform.local_service_probe_runs (environment_id, created_at DESC)
  WHERE environment_id IS NOT NULL;

-- ─── 5. Resultados por componente dentro de una sesión ─────────────────────

CREATE TABLE IF NOT EXISTS platform.local_service_probe_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL
    REFERENCES platform.local_service_probe_runs (id) ON DELETE CASCADE,
  component_id text NOT NULL
    REFERENCES platform.local_service_definitions (id) ON DELETE RESTRICT,
  ok boolean NOT NULL,
  http_status integer,
  latency_ms integer,
  error_text text,
  raw_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_local_service_probe_results_run
  ON platform.local_service_probe_results (run_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_local_service_probe_results_component
  ON platform.local_service_probe_results (component_id, created_at DESC);

-- ─── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE platform.local_service_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.local_service_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.local_service_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.local_service_probe_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.local_service_probe_results ENABLE ROW LEVEL SECURITY;

-- service_role: acceso completo (API control plane)
DO $$
BEGIN
  CREATE POLICY "local_service_definitions_service_role"
    ON platform.local_service_definitions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "local_service_environments_service_role"
    ON platform.local_service_environments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "local_service_endpoints_service_role"
    ON platform.local_service_endpoints
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "local_service_probe_runs_service_role"
    ON platform.local_service_probe_runs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "local_service_probe_results_service_role"
    ON platform.local_service_probe_results
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Catálogo de componentes: lectura para usuarios autenticados (sin datos sensibles)
DO $$
BEGIN
  CREATE POLICY "local_service_definitions_authenticated_select"
    ON platform.local_service_definitions
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Entornos: lectura de slugs / nombres (sin secretos en columnas por defecto)
DO $$
BEGIN
  CREATE POLICY "local_service_environments_authenticated_select"
    ON platform.local_service_environments
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ─── Grants ────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA platform TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.local_service_definitions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.local_service_environments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.local_service_endpoints TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.local_service_probe_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE platform.local_service_probe_results TO service_role;

GRANT SELECT ON TABLE platform.local_service_definitions TO authenticated;
GRANT SELECT ON TABLE platform.local_service_environments TO authenticated;

-- ─── Seed: definiciones canónicas (idempotente) ────────────────────────────

INSERT INTO platform.local_service_definitions (id, label, role, default_health_path, description, sort_order)
VALUES
  ('api', 'Opsly API', 'control_plane', '/api/health', 'Next.js API control plane', 10),
  ('admin', 'Opsly Admin', 'control_plane', '/api/health', 'Dashboard administración', 20),
  ('portal', 'Opsly Portal', 'edge', '/api/health', 'Portal cliente', 30),
  ('mcp', 'OpenClaw MCP', 'control_plane', '/health', 'MCP tools', 40),
  ('llm_gateway', 'LLM Gateway', 'inference', '/health', 'Routing y costes LLM', 50),
  ('orchestrator', 'Orchestrator', 'control_plane', '/health', 'BullMQ / OpenClaw', 60),
  ('context_builder', 'Context Builder', 'control_plane', '/health', 'Contexto sesiones', 70),
  ('ollama', 'Ollama', 'inference', '/api/tags', 'Inferencia local (opcional)', 80)
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform.local_service_environments (slug, display_name, default_bind_host, metadata)
VALUES ('local', 'Desarrollo local', '127.0.0.1', '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE platform.local_service_definitions IS 'Catálogo fijo de componentes local-services (API + OpenClaw stack).';
COMMENT ON TABLE platform.local_service_environments IS 'Entornos donde existen bindings (local, worker, staging).';
COMMENT ON TABLE platform.local_service_endpoints IS 'URL base y overrides de health por entorno y componente.';
COMMENT ON TABLE platform.local_service_probe_runs IS 'Ejecución agrupada de sondas HTTP (batch).';
COMMENT ON TABLE platform.local_service_probe_results IS 'Resultado de una sonda por componente dentro de un run.';
