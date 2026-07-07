-- Peskids: track the Twenty Task synced from a lead-linked followup, so
-- status changes (complete/cancel) can be reflected back on the same task.
ALTER TABLE public.followups
  ADD COLUMN IF NOT EXISTS twenty_task_id TEXT;
