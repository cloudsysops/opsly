-- Peskids improvement tracker metadata for client-visible request status.
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

COMMENT ON COLUMN public.staff_improvement_messages.client_status IS
  'Estado visible para cliente: recibido, priorizado, en_desarrollo, listo_para_probar, aprobado, publicado, backlog, cerrado.';
COMMENT ON COLUMN public.staff_improvement_messages.github_issue_url IS
  'Issue interno de GitHub asociado, cuando exista.';
COMMENT ON COLUMN public.staff_improvement_messages.github_pr_url IS
  'Pull request interno asociado, cuando exista.';
COMMENT ON COLUMN public.staff_improvement_messages.preview_url IS
  'URL para que el cliente pruebe el cambio antes de producción.';
COMMENT ON COLUMN public.staff_improvement_messages.production_url IS
  'URL final en producción cuando el cambio esté publicado.';
COMMENT ON COLUMN public.staff_improvement_messages.operator_notes IS
  'Notas cortas de Opsly visibles para el equipo autorizado.';

COMMIT;
