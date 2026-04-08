-- Correcciones arquitectura DB (post 0010 feedback + alineación revisión)
-- Idempotente: usa DO / IF NOT EXISTS donde aplica.
-- Nota: Postgres no soporta ADD CONSTRAINT IF NOT EXISTS; usamos pg_catalog.
-- Seguimiento: 0012_llm_feedback_conversations_fk.sql reasigna llm_feedback.conversation_id
-- a platform.conversations (sesiones ML/Beast), no a feedback_conversations del portal.

-- ─── FEEDBACK CONVERSATIONS: unicidad sesión por tenant ─────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE c.conname = 'uq_feedback_tenant_session'
      AND n.nspname = 'platform'
      AND r.relname = 'feedback_conversations'
  ) THEN
    ALTER TABLE platform.feedback_conversations
      ADD CONSTRAINT uq_feedback_tenant_session UNIQUE (tenant_slug, session_id);
  END IF;
END $$;

-- Columna outcome (opcional; filas existentes pueden ser NULL)
ALTER TABLE platform.feedback_conversations
  ADD COLUMN IF NOT EXISTS outcome text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE c.conname = 'chk_feedback_outcome'
      AND n.nspname = 'platform'
      AND r.relname = 'feedback_conversations'
  ) THEN
    ALTER TABLE platform.feedback_conversations
      ADD CONSTRAINT chk_feedback_outcome
      CHECK (
        outcome IS NULL
        OR outcome IN ('resolved', 'escalated', 'abandoned')
      )
      NOT VALID;
  END IF;
END $$;

-- Índice compuesto tenant + fecha (reemplaza nombre legacy de 0010 si existe)
DROP INDEX IF EXISTS platform.idx_feedback_tenant;
CREATE INDEX IF NOT EXISTS idx_conv_tenant_created
  ON platform.feedback_conversations(tenant_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_tenant_session
  ON platform.feedback_conversations(tenant_slug, session_id);

-- ─── FEEDBACK MESSAGES: FK CASCADE explícita ─────────────────────────────

ALTER TABLE platform.feedback_messages
  DROP CONSTRAINT IF EXISTS feedback_messages_conversation_id_fkey;

ALTER TABLE platform.feedback_messages
  ADD CONSTRAINT feedback_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES platform.feedback_conversations(id)
  ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'platform'
      AND table_name = 'feedback_messages'
      AND column_name = 'tenant_slug'
  ) THEN
    ALTER TABLE platform.feedback_messages
      DROP COLUMN tenant_slug;
  END IF;
END $$;

-- ─── FEEDBACK DECISIONS ─────────────────────────────────────────────────

ALTER TABLE platform.feedback_decisions
  DROP CONSTRAINT IF EXISTS feedback_decisions_conversation_id_fkey;

ALTER TABLE platform.feedback_decisions
  ADD CONSTRAINT feedback_decisions_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES platform.feedback_conversations(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_decisions_type_created
  ON platform.feedback_decisions(decision_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decisions_conversation
  ON platform.feedback_decisions(conversation_id);

-- (usage_events 0009: sin FK tenant_slug — flexibilidad multi-tenant)

-- ─── LLM FEEDBACK (sin tenant_slug duplicado; join a conversación) ───────

CREATE TABLE IF NOT EXISTS platform.llm_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES platform.feedback_conversations(id)
    ON DELETE CASCADE,
  message_index integer,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  correction text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_feedback_conversation
  ON platform.llm_feedback(conversation_id);

-- ─── CONVERSATIONS ML (sesión genérica; distinta de feedback_conversations)

CREATE TABLE IF NOT EXISTS platform.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL,
  session_id text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  model_used text,
  quality_score double precision,
  outcome text CHECK (
    outcome IS NULL
    OR outcome IN ('resolved', 'escalated', 'abandoned')
  ),
  tokens_total integer,
  cost_usd numeric(10, 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, session_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant_created
  ON platform.conversations(tenant_slug, created_at DESC);

-- ─── GRANTS service_role ─────────────────────────────────────────────────

GRANT INSERT, SELECT, UPDATE, DELETE ON
  platform.llm_feedback,
  platform.conversations
TO service_role;

GRANT DELETE ON
  platform.feedback_conversations,
  platform.feedback_messages,
  platform.feedback_decisions,
  platform.agent_teams,
  platform.agent_executions
TO service_role;

-- ─── RLS (base; service_role bypass en Supabase) ────────────────────────

ALTER TABLE platform.feedback_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.feedback_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.feedback_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.llm_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.agent_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.agent_executions ENABLE ROW LEVEL SECURITY;
