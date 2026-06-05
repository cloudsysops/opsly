-- Panini Lab demo tenant — sticker collection + conversation log (Sprint 2).
-- Idempotent; does not modify Peskids or platform tenant stacks.

BEGIN;

CREATE SCHEMA IF NOT EXISTS panini_lab;

CREATE TABLE IF NOT EXISTS panini_lab.collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'panini-lab',
  sticker_number integer NOT NULL,
  status text NOT NULL DEFAULT 'owned' CHECK (
    status IN ('owned', 'duplicate', 'missing', 'want')
  ),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_slug, sticker_number)
);

CREATE TABLE IF NOT EXISTS panini_lab.conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'panini-lab',
  channel text NOT NULL DEFAULT 'webhook',
  sender text,
  raw_input text NOT NULL,
  intent text,
  entities jsonb NOT NULL DEFAULT '{}'::jsonb,
  opsly_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panini_collection_tenant
  ON panini_lab.collection_items (tenant_slug, sticker_number);

CREATE INDEX IF NOT EXISTS idx_panini_conversation_created
  ON panini_lab.conversation_events (tenant_slug, created_at DESC);

ALTER TABLE panini_lab.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE panini_lab.conversation_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_all_collection_items"
    ON panini_lab.collection_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "service_role_all_conversation_events"
    ON panini_lab.conversation_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT USAGE ON SCHEMA panini_lab TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA panini_lab TO service_role;

COMMIT;
