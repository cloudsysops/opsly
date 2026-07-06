-- Expand message status values for approval-first workflow (Phase 2 Week 2)

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_status_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_status_check
  CHECK (
    status IS NULL OR status IN (
      'pending',
      'pending_approval',
      'approved',
      'sent',
      'failed',
      'skipped'
    )
  );
