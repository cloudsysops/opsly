-- PR-PRO-4 (mirror): observability for Twenty Task sync on public.followups
ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS sync_status TEXT,
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'followups_sync_status_check'
  ) THEN
    ALTER TABLE public.followups
      ADD CONSTRAINT followups_sync_status_check
      CHECK (
        sync_status IS NULL
        OR sync_status IN ('pending', 'synced', 'failed', 'retrying', 'skipped')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_followups_sync_status
  ON public.followups (tenant_id, sync_status)
  WHERE sync_status IS NOT NULL;
