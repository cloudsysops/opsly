-- QA slice: keep class feedback on the canonical class enrollment row.
-- Do not apply to production without the normal migration gate.

ALTER TABLE peskids.class_enrollments
  ADD COLUMN IF NOT EXISTS behavior_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS teacher_note text,
  ADD COLUMN IF NOT EXISTS attendance_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_updated_by uuid;

ALTER TABLE peskids.class_enrollments
  DROP CONSTRAINT IF EXISTS class_enrollments_behavior_tags_check;

ALTER TABLE peskids.class_enrollments
  ADD CONSTRAINT class_enrollments_behavior_tags_check
  CHECK (behavior_tags <@ ARRAY['happy', 'engaged', 'calm', 'shy', 'tired', 'needs_support', 'other']::text[]);

ALTER TABLE peskids.class_enrollments
  ADD CONSTRAINT class_enrollments_teacher_note_length_check
  CHECK (teacher_note IS NULL OR char_length(teacher_note) <= 500);
