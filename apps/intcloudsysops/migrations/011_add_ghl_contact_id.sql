-- Peskids: add ghl_contact_id to leads, students, and parents
-- This column maps Peskids entities to GoHighLevel contact IDs
-- for bidirectional sync between the two systems.

BEGIN;

-- public.leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_ghl_contact_id
  ON public.leads (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

-- public.students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;

CREATE INDEX IF NOT EXISTS idx_students_ghl_contact_id
  ON public.students (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

-- public.parents (may not exist yet in all environments)
DO $$ BEGIN
  ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_parents_ghl_contact_id
    ON public.parents (ghl_contact_id)
    WHERE ghl_contact_id IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

COMMIT;
