-- Allow 'staff_lead_notification' email_type: staff-facing alert to
-- peskidsnatacion@gmail.com when a teacher-applicant or company (alliance)
-- lead comes in. Additive only.

BEGIN;

ALTER TABLE platform.peskids_lead_email_deliveries
  DROP CONSTRAINT IF EXISTS peskids_lead_email_deliveries_email_type_check;

ALTER TABLE platform.peskids_lead_email_deliveries
  ADD CONSTRAINT peskids_lead_email_deliveries_email_type_check
  CHECK (email_type IN ('lead_confirmation', 'staff_lead_notification'));

COMMIT;
