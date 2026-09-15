-- Admin data backups: raw CSV/Excel uploads of the client database, kept
-- as-is for manual review before deciding how (or whether) to reflect them
-- in Twenty CRM. Complements the existing students/staff CSV import (which
-- writes structured rows directly into the app) — this path just preserves
-- the original file untouched. Reuses the existing peskids-staff-uploads
-- storage bucket (see 20260726_staff_improvement_attachments.sql).
BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_data_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'peskids',
  uploaded_by_email text,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_path text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_data_backups_tenant_created
  ON public.admin_data_backups (tenant_id, created_at DESC);

ALTER TABLE public.admin_data_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_admin_data_backups"
  ON public.admin_data_backups;
CREATE POLICY "service_role_all_admin_data_backups"
  ON public.admin_data_backups
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_data_backups TO service_role;

COMMENT ON TABLE public.admin_data_backups IS
  'Raw client-database files (CSV/Excel) uploaded by admin staff, kept untouched for manual review before deciding how to reflect them in Twenty CRM. Files live in storage bucket peskids-staff-uploads under {tenant}/db-backups/.';

COMMIT;
