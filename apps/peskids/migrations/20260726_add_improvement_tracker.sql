-- App mirror: Peskids improvement tracker metadata.
BEGIN;

ALTER TABLE public.staff_improvement_messages
  ADD COLUMN IF NOT EXISTS client_status text NOT NULL DEFAULT 'recibido',
  ADD COLUMN IF NOT EXISTS github_issue_url text,
  ADD COLUMN IF NOT EXISTS github_pr_url text,
  ADD COLUMN IF NOT EXISTS preview_url text,
  ADD COLUMN IF NOT EXISTS production_url text,
  ADD COLUMN IF NOT EXISTS operator_notes text,
  ADD COLUMN IF NOT EXISTS ready_for_client_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

DO $$
BEGIN
  ALTER TABLE public.staff_improvement_messages
    DROP CONSTRAINT IF EXISTS staff_improvement_messages_client_status_check;

  ALTER TABLE public.staff_improvement_messages
    ADD CONSTRAINT staff_improvement_messages_client_status_check
    CHECK (
      client_status IN (
        'recibido',
        'priorizado',
        'en_desarrollo',
        'listo_para_probar',
        'aprobado',
        'publicado',
        'backlog',
        'cerrado'
      )
    );
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_improvement_messages_tenant_status_created
  ON public.staff_improvement_messages (tenant_id, client_status, created_at DESC);

COMMIT;
