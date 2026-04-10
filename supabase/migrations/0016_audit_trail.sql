-- Audit trail inmutable: registra mutaciones (POST/PATCH/DELETE) en la plataforma.
-- Tabla de solo escritura: sin UPDATE ni DELETE permitidos vía RLS.
-- Usada por GET /api/admin/audit con paginación cursor.

CREATE TABLE IF NOT EXISTS platform.audit_events (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug  text,
  actor_email  text,
  action       text        NOT NULL,        -- método HTTP: POST, PATCH, DELETE
  resource     text        NOT NULL,        -- path de la ruta, e.g. /api/tenants
  status_code  integer,
  ip           text,
  user_agent   text,
  metadata     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices para las consultas más comunes
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created
  ON platform.audit_events (tenant_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_created
  ON platform.audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action
  ON platform.audit_events (action, created_at DESC);

-- RLS: solo service role puede insertar; nadie puede actualizar ni borrar
ALTER TABLE platform.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_insert_service_only
  ON platform.audit_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY audit_events_select_service_only
  ON platform.audit_events
  FOR SELECT
  TO service_role
  USING (true);

-- Denegar explícitamente UPDATE y DELETE a todos
CREATE POLICY audit_events_no_update
  ON platform.audit_events
  FOR UPDATE
  USING (false);

CREATE POLICY audit_events_no_delete
  ON platform.audit_events
  FOR DELETE
  USING (false);

-- GRANT mínimos para el service role
GRANT INSERT, SELECT ON platform.audit_events TO service_role;
