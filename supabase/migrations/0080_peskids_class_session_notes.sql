-- Release 3: teacher session notes on scheduled classes
ALTER TABLE peskids.classes
  ADD COLUMN IF NOT EXISTS session_notes text;

COMMENT ON COLUMN peskids.classes.session_notes IS
  'Optional post-class notes written by the assigned professor.';
