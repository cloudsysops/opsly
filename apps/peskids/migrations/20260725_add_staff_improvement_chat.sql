-- Staff improvement-request chat: owner/staff describe platform improvements
-- they want; AI classifies + summarizes + drafts a Twenty CRM task.
BEGIN;

CREATE TABLE IF NOT EXISTS public.staff_improvement_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT 'peskids',
  role text NOT NULL CHECK (role IN ('staff', 'assistant')),
  author_email text,
  body text NOT NULL,
  category text CHECK (category IN ('bug', 'feature', 'improvement', 'security', 'billing', 'question', 'other')),
  priority text CHECK (priority IN ('alta', 'media', 'baja')),
  ai_summary text,
  twenty_task_id text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'analyzed', 'task_created', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_improvement_messages_tenant_created
  ON public.staff_improvement_messages (tenant_id, created_at);

ALTER TABLE public.staff_improvement_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_staff_improvement_messages"
  ON public.staff_improvement_messages;
CREATE POLICY "service_role_all_staff_improvement_messages"
  ON public.staff_improvement_messages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_improvement_messages TO service_role;

COMMENT ON TABLE public.staff_improvement_messages IS
  'Staff-only chat: platform improvement requests + AI classification/summary, optionally synced to a Twenty CRM task.';
COMMENT ON COLUMN public.staff_improvement_messages.role IS
  'staff = message written by the Peskids team; assistant = AI reply/analysis';
COMMENT ON COLUMN public.staff_improvement_messages.twenty_task_id IS
  'Twenty CRM task id created from this request, when Twenty sync is enabled and the message was actionable';

COMMIT;
