-- Waitlist for full classes: a new 'waitlisted' enrollment status. When a
-- confirmed/reserved seat cancels, the earliest waitlisted enrollment (by
-- joined_at) is promoted to 'reserved' instead of the seat just opening up
-- silently. Safe to re-run (constraint drop+recreate).

BEGIN;

ALTER TABLE peskids.class_enrollments
  DROP CONSTRAINT IF EXISTS class_enrollments_status_check;

ALTER TABLE peskids.class_enrollments
  ADD CONSTRAINT class_enrollments_status_check
  CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'no_show', 'attended', 'waitlisted'));

COMMIT;
