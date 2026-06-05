-- Peskids GoHighLevel intake fields and idempotent lead identity

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS lead_id text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS interest text,
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS automation_ready boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE platform.peskids_leads
    ADD CONSTRAINT peskids_leads_stage_check
      CHECK (
        stage IS NULL
        OR stage IN (
          'New Lead',
          'Contacted',
          'Trial Class',
          'Enrolled',
          'Active Student',
          'Renewal'
        )
      );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE platform.peskids_leads
    ADD CONSTRAINT peskids_leads_source_check
      CHECK (
        source IS NULL
        OR source IN ('web', 'gohighlevel', 'n8n', 'manual')
      );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_peskids_leads_tenant_lead_id_unique
  ON platform.peskids_leads (tenant_slug, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_tenant_stage_created
  ON platform.peskids_leads (tenant_slug, stage, created_at DESC);
