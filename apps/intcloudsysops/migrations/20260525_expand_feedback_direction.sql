-- Expand feedback to support bidirectional teacher-family communication.
-- Keeps legacy columns for backward compatibility.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS author_type TEXT NOT NULL DEFAULT 'parent',
  ADD COLUMN IF NOT EXISTS author_ref_id UUID,
  ADD COLUMN IF NOT EXISTS subject_type TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS subject_ref_id UUID,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS rating SMALLINT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

DO $$
BEGIN
  ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_author_type_check
    CHECK (author_type IN ('parent', 'teacher', 'staff'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_subject_type_check
    CHECK (subject_type IN ('general', 'class', 'student', 'operations'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_status_check
    CHECK (status IN ('new', 'reviewed', 'action_required', 'closed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
