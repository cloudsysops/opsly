-- Thread metadata for inbox + AI drafts (approval-first)

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'inbound'
    CHECK (direction IN ('inbound', 'draft', 'outbound'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS status TEXT
    CHECK (status IS NULL OR status IN ('pending', 'approved', 'sent'));

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);
