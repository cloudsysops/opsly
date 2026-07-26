-- Change-request intake (Part 2): ordered human approval → agent-ready tickets.
-- AI classifies/summarizes ONLY — never executes code, WhatsApp, or deploy.
BEGIN;

-- Expand status lifecycle while keeping legacy values (task_created, dismissed).
ALTER TABLE public.staff_improvement_messages
  DROP CONSTRAINT IF EXISTS staff_improvement_messages_status_check;

ALTER TABLE public.staff_improvement_messages
  ADD CONSTRAINT staff_improvement_messages_status_check
  CHECK (status IN (
    'new',
    'analyzed',
    'task_created',
    'triaged',
    'approved',
    'in_progress',
    'shipped',
    'rejected',
    'dismissed'
  ));

ALTER TABLE public.staff_improvement_messages
  ADD COLUMN IF NOT EXISTS operator_notes text,
  ADD COLUMN IF NOT EXISTS linked_pr text,
  ADD COLUMN IF NOT EXISTS linked_issue text,
  ADD COLUMN IF NOT EXISTS agent_ticket jsonb;

COMMENT ON COLUMN public.staff_improvement_messages.operator_notes IS
  'Opsly operator notes during human triage/approval (never auto-executed).';
COMMENT ON COLUMN public.staff_improvement_messages.linked_pr IS
  'Optional GitHub PR URL/ref once work starts — informational only.';
COMMENT ON COLUMN public.staff_improvement_messages.linked_issue IS
  'Optional GitHub issue URL/ref — informational only.';
COMMENT ON COLUMN public.staff_improvement_messages.agent_ticket IS
  'Fase AI 2 payload built on human approve. Context for agents — NEVER auto-executed (no code, WhatsApp, or deploy).';
COMMENT ON COLUMN public.staff_improvement_messages.status IS
  'Intake lifecycle: new → analyzed|task_created → triaged|approved|rejected → in_progress → shipped. Legacy: dismissed.';
COMMENT ON COLUMN public.staff_improvement_messages.twenty_task_id IS
  'Twenty CRM task id (best-effort, non-blocking). Not an execution trigger.';

CREATE INDEX IF NOT EXISTS idx_staff_improvement_messages_tenant_status
  ON public.staff_improvement_messages (tenant_id, status)
  WHERE role = 'staff';

CREATE INDEX IF NOT EXISTS idx_staff_improvement_messages_tenant_priority
  ON public.staff_improvement_messages (tenant_id, priority)
  WHERE role = 'staff';

CREATE INDEX IF NOT EXISTS idx_staff_improvement_messages_tenant_category
  ON public.staff_improvement_messages (tenant_id, category)
  WHERE role = 'staff';

COMMIT;
