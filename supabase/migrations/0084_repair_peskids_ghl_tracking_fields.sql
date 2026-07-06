-- Repair: 0075 marked applied in prod but GHL columns were missing (schema drift).
-- Idempotent re-apply of platform.peskids_leads GHL tracking fields.

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS ghl_contact_id text,
  ADD COLUMN IF NOT EXISTS ghl_opportunity_id text,
  ADD COLUMN IF NOT EXISTS ghl_pipeline_id text,
  ADD COLUMN IF NOT EXISTS ghl_stage_id text;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_ghl_contact_id
  ON platform.peskids_leads (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_ghl_opportunity_id
  ON platform.peskids_leads (ghl_opportunity_id)
  WHERE ghl_opportunity_id IS NOT NULL;
