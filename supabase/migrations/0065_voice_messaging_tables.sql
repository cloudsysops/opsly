-- Voice Messaging Tables
-- Supports calls, voice messages, and transcriptions across WhatsApp, Telegram, and web

BEGIN;

-- Calls table
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  call_id TEXT NOT NULL UNIQUE,
  initiator_contact TEXT NOT NULL,
  recipient_contact TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'web')),
  call_state TEXT NOT NULL CHECK (call_state IN ('ringing', 'connected', 'hold', 'ended', 'failed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  recording_url TEXT,
  recording_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice transcriptions table
CREATE TABLE IF NOT EXISTS public.voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('caller', 'recipient', 'assistant')),
  transcript_text TEXT,
  confidence FLOAT,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend messages table with voice support
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS audio_duration_seconds INT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS transcript TEXT;

-- Indexes for calls table
CREATE INDEX IF NOT EXISTS idx_calls_tenant ON public.calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_id ON public.calls(call_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_channel ON public.calls(channel);
CREATE INDEX IF NOT EXISTS idx_calls_state ON public.calls(call_state);

-- Indexes for transcriptions table
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_tenant ON public.voice_transcriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_call_id ON public.voice_transcriptions(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcriptions_created_at ON public.voice_transcriptions(created_at);

-- RLS Policies for calls table
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY calls_service_role_all ON public.calls FOR ALL
    USING (auth.uid() IS NULL OR auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY calls_authenticated_select ON public.calls FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND tenant_id = COALESCE(
        auth.jwt() #>> '{user_metadata,tenant_slug}',
        auth.jwt() #>> '{app_metadata,tenant_slug}'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS Policies for voice_transcriptions table
ALTER TABLE public.voice_transcriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY voice_transcriptions_service_role_all ON public.voice_transcriptions FOR ALL
    USING (auth.uid() IS NULL OR auth.jwt() ->> 'role' = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY voice_transcriptions_authenticated_select ON public.voice_transcriptions FOR SELECT
    USING (
      auth.uid() IS NOT NULL
      AND tenant_id = COALESCE(
        auth.jwt() #>> '{user_metadata,tenant_slug}',
        auth.jwt() #>> '{app_metadata,tenant_slug}'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
