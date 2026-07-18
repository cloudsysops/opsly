-- Peskids: Twenty CRM traceability for form submissions
-- Lets a submission record which Twenty person it synced to, so the sync
-- can look-up-before-create instead of blindly creating a new person.

BEGIN;

ALTER TABLE peskids.form_submissions
  ADD COLUMN IF NOT EXISTS twenty_person_id text,
  ADD COLUMN IF NOT EXISTS twenty_synced_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_form_submissions_twenty_person_id
  ON peskids.form_submissions (twenty_person_id)
  WHERE twenty_person_id IS NOT NULL;

COMMIT;
