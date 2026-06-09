-- Auto-followup tracking for Peskids leads 24h without contact
-- Enables the followup service to mark, log, and idempotently process leads

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS followup_log JSONB DEFAULT '[]'::jsonb;

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS followup_sent BOOLEAN NOT NULL DEFAULT false;
