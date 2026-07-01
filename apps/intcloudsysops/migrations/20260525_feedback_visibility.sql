-- Add visibility and audience to feedback so admin-private notes stay out of teacher views.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'family';

DO $$
BEGIN
  ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_visibility_check
    CHECK (visibility IN ('public', 'private'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.feedback
    ADD CONSTRAINT feedback_audience_check
    CHECK (audience IN ('family', 'teacher', 'admin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_visibility ON public.feedback(visibility);
CREATE INDEX IF NOT EXISTS idx_feedback_audience ON public.feedback(audience);
