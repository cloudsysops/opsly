-- Peskids: Twenty CRM external ids (migration off GoHighLevel)

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS twenty_person_id text,
  ADD COLUMN IF NOT EXISTS twenty_opportunity_id text;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_twenty_person_id
  ON platform.peskids_leads (twenty_person_id)
  WHERE twenty_person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_twenty_opportunity_id
  ON platform.peskids_leads (twenty_opportunity_id)
  WHERE twenty_opportunity_id IS NOT NULL;
