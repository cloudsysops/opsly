-- Drop retired GoHighLevel tracking columns (Twenty + n8n is canonical CRM).
-- Historical migrations that ADDed these columns stay immutable.
-- Idempotent: safe if columns/indexes/tables already absent.

-- platform.peskids_leads
DROP INDEX IF EXISTS platform.idx_peskids_leads_ghl_contact_id;
DROP INDEX IF EXISTS platform.idx_peskids_leads_ghl_opportunity_id;

ALTER TABLE IF EXISTS platform.peskids_leads
  DROP COLUMN IF EXISTS ghl_contact_id,
  DROP COLUMN IF EXISTS ghl_opportunity_id,
  DROP COLUMN IF EXISTS ghl_pipeline_id,
  DROP COLUMN IF EXISTS ghl_stage_id;

-- public.intcloudsysops_contacts
DROP INDEX IF EXISTS public.idx_intcloudsysops_contacts_ghl_contact_id;

ALTER TABLE IF EXISTS public.intcloudsysops_contacts
  DROP COLUMN IF EXISTS ghl_contact_id;

-- public.leads / students / parents (Peskids app tables, if present)
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_leads_ghl_contact_id';
    EXECUTE 'ALTER TABLE public.leads DROP COLUMN IF EXISTS ghl_contact_id';
  END IF;
  IF to_regclass('public.students') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_students_ghl_contact_id';
    EXECUTE 'ALTER TABLE public.students DROP COLUMN IF EXISTS ghl_contact_id';
  END IF;
  IF to_regclass('public.parents') IS NOT NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_parents_ghl_contact_id';
    EXECUTE 'ALTER TABLE public.parents DROP COLUMN IF EXISTS ghl_contact_id';
  END IF;
END $$;
