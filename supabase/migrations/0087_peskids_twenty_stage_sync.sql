-- PR-PRO-3: Twenty opportunity stage-sync observability on platform.peskids_leads

BEGIN;

ALTER TABLE platform.peskids_leads
  ADD COLUMN IF NOT EXISTS twenty_sync_status text,
  ADD COLUMN IF NOT EXISTS twenty_sync_error text,
  ADD COLUMN IF NOT EXISTS twenty_synced_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'peskids_leads_twenty_sync_status_check'
  ) THEN
    ALTER TABLE platform.peskids_leads
      ADD CONSTRAINT peskids_leads_twenty_sync_status_check
      CHECK (
        twenty_sync_status IS NULL
        OR twenty_sync_status IN ('pending', 'synced', 'failed', 'retrying', 'skipped')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_peskids_leads_twenty_sync_status
  ON platform.peskids_leads (tenant_slug, twenty_sync_status)
  WHERE twenty_sync_status IS NOT NULL;

COMMENT ON COLUMN platform.peskids_leads.twenty_sync_status IS
  'Twenty CRM sync state for opportunity stage (pending|synced|failed|retrying|skipped)';
COMMENT ON COLUMN platform.peskids_leads.twenty_sync_error IS
  'Last Twenty stage-sync error detail (truncated)';
COMMENT ON COLUMN platform.peskids_leads.twenty_synced_at IS
  'Timestamp of last successful Twenty stage sync';

COMMIT;
