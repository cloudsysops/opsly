-- Peskids Messages Table
-- Stores inbound messages from all channels (WhatsApp, Instagram, web)
-- Used for centralized inbox dashboard + approval-first reply workflow

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'instagram', 'web')),
  sender_name TEXT,
  sender_contact TEXT NOT NULL, -- phone number or Instagram handle
  message_text TEXT NOT NULL,
  external_id TEXT, -- Baileys message ID or Instagram message ID for reply tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_tenant ON public.messages(tenant_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_source ON public.messages(source);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role only (no client access in MVP)
CREATE POLICY "Service role can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (CURRENT_SETTING('app.settings.is_service_role', true) = 'true');

CREATE POLICY "Service role can read messages"
  ON public.messages
  FOR SELECT
  USING (CURRENT_SETTING('app.settings.is_service_role', true) = 'true');

CREATE POLICY "Authenticated users can read messages for their tenant"
  ON public.messages
  FOR SELECT
  USING (
    tenant_id = CURRENT_SETTING('app.settings.tenant_id', true)
    OR CURRENT_SETTING('app.settings.is_service_role', true) = 'true'
  );
