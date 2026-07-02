-- ICSO / Intcloudsysops — external CRM ids on local operational tables
-- Migration: 0083_intcloudsysops_crm_external_ids.sql

ALTER TABLE public.intcloudsysops_contacts
  ADD COLUMN IF NOT EXISTS ghl_contact_id text,
  ADD COLUMN IF NOT EXISTS twenty_person_id text,
  ADD COLUMN IF NOT EXISTS source_form text;

ALTER TABLE public.intcloudsysops_deals
  ADD COLUMN IF NOT EXISTS twenty_opportunity_id text;

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_contacts_ghl_contact_id
  ON public.intcloudsysops_contacts (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_contacts_twenty_person_id
  ON public.intcloudsysops_contacts (twenty_person_id)
  WHERE twenty_person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intcloudsysops_deals_twenty_opportunity_id
  ON public.intcloudsysops_deals (twenty_opportunity_id)
  WHERE twenty_opportunity_id IS NOT NULL;
