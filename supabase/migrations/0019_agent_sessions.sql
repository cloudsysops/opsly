-- Migración 0019: Agent Sessions — persistencia de contexto cross-session
-- Sprint 4, Phase D (Context Persistence)
--
-- Objetivo: el Context Builder puede recuperar el estado de una sesión anterior
-- cuando un agente retoma una tarea, sin perder decisiones, ítems abiertos ni historial.
--
-- TTL enforced por plan:
--   startup   → 24h
--   business  → 7d
--   enterprise → 30d
--
-- La limpieza (expired_at < now()) puede hacerse con un pg_cron job o desde un worker BullMQ.

BEGIN;

CREATE TABLE IF NOT EXISTS platform.agent_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug     TEXT NOT NULL REFERENCES platform.tenants(slug) ON DELETE CASCADE,
  session_key     TEXT NOT NULL, -- clave de negocio (p.ej. "cursor:task:abc123")
  agent_role      TEXT NOT NULL CHECK (agent_role IN ('planner','executor','tool','notifier')),

  -- Contexto serializado (JSON estructurado)
  summary         TEXT     NOT NULL DEFAULT '',
  open_items      JSONB    NOT NULL DEFAULT '[]',  -- lista de strings/objetos con tareas abiertas
  decisions       JSONB    NOT NULL DEFAULT '[]',  -- decisiones tomadas en la sesión
  metadata        JSONB    NOT NULL DEFAULT '{}',  -- datos extras por tipo de agente

  -- Control de vida (TTL por plan)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL, -- calculado al insertar/actualizar según plan

  -- Deduplicación: una clave activa por tenant
  UNIQUE (tenant_slug, session_key)
);

-- Índices de acceso frecuente
CREATE INDEX IF NOT EXISTS idx_agent_sessions_tenant ON platform.agent_sessions(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_expires ON platform.agent_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_key ON platform.agent_sessions(tenant_slug, session_key);

-- Trigger: actualizar updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION platform.update_agent_session_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_sessions_updated_at ON platform.agent_sessions;
CREATE TRIGGER trg_agent_sessions_updated_at
  BEFORE UPDATE ON platform.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION platform.update_agent_session_ts();

-- RLS: lectura y escritura solo con service_role (contexto de agentes es interno)
ALTER TABLE platform.agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_sessions_service_role ON platform.agent_sessions;
CREATE POLICY agent_sessions_service_role ON platform.agent_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON platform.agent_sessions TO service_role;
GRANT USAGE ON SEQUENCE platform.agent_sessions_id_seq TO service_role; -- puede no existir (UUID)

COMMIT;
