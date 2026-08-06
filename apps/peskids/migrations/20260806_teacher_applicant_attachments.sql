-- Storage bucket for teacher-applicant CV + swimming-video uploads.
-- Required by the "Trabaja con nosotros" form (curriculum + swimming_video are
-- mandatory attachments as of 2026-08-06).
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'peskids-teacher-applications',
  'peskids-teacher-applications',
  false,
  104857600, -- 100 MiB (covers the swimming video; CV/ID copy are far smaller)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service_role_peskids_teacher_applications"
  ON storage.objects;
CREATE POLICY "service_role_peskids_teacher_applications"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'peskids-teacher-applications')
  WITH CHECK (bucket_id = 'peskids-teacher-applications');

COMMIT;
