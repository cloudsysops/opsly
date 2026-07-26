-- Staff improvement chat attachments + storage bucket for ops uploads
BEGIN;

ALTER TABLE public.staff_improvement_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.staff_improvement_messages.attachments IS
  'Array of {name,mime_type,size_bytes,storage_path?,content_base64?} for images/PDF samples.';

-- Private bucket for staff uploads (service_role only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'peskids-staff-uploads',
  'peskids-staff-uploads',
  false,
  5242880,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "service_role_peskids_staff_uploads"
  ON storage.objects;
CREATE POLICY "service_role_peskids_staff_uploads"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'peskids-staff-uploads')
  WITH CHECK (bucket_id = 'peskids-staff-uploads');

COMMIT;
