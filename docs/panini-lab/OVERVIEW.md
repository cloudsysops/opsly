---
title: Panini Lab — Voice Messaging & Call Management
status: published
updated: 2026-05-29
audience: Platform engineers, Peskids team, future tenants
---

# Panini Lab — Voice Messaging & Call Management Overview

**Panini Lab** is Opsly's modular voice messaging and call management system, enabling real-time calling, voice message recording, and call analytics across WhatsApp, Telegram, and web platforms.

## What is Panini Lab?

Panini Lab is a **provider-agnostic voice layer** that abstracts the complexity of managing calls and voice messages across multiple channels and platforms. It provides:

- **Voice Calls** — Real-time calling with state tracking (ringing → connected → ended)
- **Voice Messages** — Audio file recordings with optional transcription
- **Multi-Channel Support** — WhatsApp, Telegram, Web (WebRTC)
- **Recording & Analytics** — Automatic call recording, duration tracking, participant data
- **Multi-Tenant Isolation** — Built-in Row-Level Security (RLS) policies per tenant
- **Provider Abstraction** — Start with one provider (Twilio), extend to others (Vonage, WhatsApp API) without changing application code

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Application Layer                           │
│  (peskids portal, admin UI, N8N workflows)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Voice Messaging Library                        │
│  (@intcloudsysops/voice-messaging)                             │
│                                                                  │
│  ┌─────────────────┐      ┌────────────────┐                   │
│  │ VoiceProvider   │      │  CallManager   │                   │
│  │ (abstraction)   │      │  (database)    │                   │
│  └────────┬────────┘      └────────────────┘                   │
│           │                                                      │
│  ┌────────┴──────────────────────────────────────┐             │
│  │ Provider Implementations                       │             │
│  │ - TwilioVoiceProvider                         │             │
│  │ - WhatsAppVoiceProvider (future)              │             │
│  │ - VonageVoiceProvider (future)                │             │
│  └─────────────────────────────────────────────────┘           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│            External Provider APIs                              │
│  (Twilio, WhatsApp API, Vonage, WebRTC gateway)               │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase (PostgreSQL)                         │
│  - calls table (state tracking, duration, recording)           │
│  - voice_transcriptions table (call transcripts)               │
│  - messages table (extended for audio_url, transcripts)        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Channels

Panini Lab supports three communication channels:

- **whatsapp** — WhatsApp Baileys integration (text) or WhatsApp API (voice capable)
- **telegram** — Telegram Bot API
- **web** — WebRTC for in-browser calling and voice message recording

### Call States

Calls transition through a state machine:

```
ringing → connected → [hold] → ended
           ↓
         failed
```

- `ringing` — Call initiated, waiting for recipient to answer
- `connected` — Both parties actively in call
- `hold` — Call paused (optional)
- `ended` — Call completed normally
- `failed` — Call failed (recipient busy, no answer, network error)

### Provider Abstraction

All providers implement `BaseVoiceProvider` interface:

```typescript
abstract class BaseVoiceProvider {
  abstract initiateCall(options: InitiateCallOptions): Promise<Call>;
  abstract endCall(tenantId: string, callId: string): Promise<void>;
  abstract recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage>;
  abstract transcribeCall(options: TranscribeCallOptions): Promise<VoiceTranscription>;
  
  // Webhook handlers (provider-specific)
  abstract handleCallStateWebhook(payload: Record<string, unknown>): Promise<Call>;
  abstract handleVoiceMessageWebhook(payload: Record<string, unknown>): Promise<VoiceMessage>;
  abstract handleTranscriptionWebhook(payload: Record<string, unknown>): Promise<VoiceTranscription>;
  
  abstract validateCredentials(): Promise<boolean>;
}
```

This abstraction means **adding a new provider requires only extending `BaseVoiceProvider`** — no changes to business logic.

## Modules

### lib/voice-messaging

**Location:** `/home/user/opsly/lib/voice-messaging`

**Exports:**
- `BaseVoiceProvider` — Abstract base class for providers
- `TwilioVoiceProvider` — Twilio implementation (current)
- `VoiceProviderFactory` — Factory for creating providers
- `CallManager` — Service for managing call lifecycle in Supabase
- `VoiceMessagesService` — Service for voice message storage
- `TranscriptionService` — Service for transcription storage
- Types: `Call`, `VoiceMessage`, `VoiceTranscription`, `Channel`, `CallState`

**Entry point:** `/home/user/opsly/lib/voice-messaging/src/index.ts`

### apps/api

**Voice endpoints:**
- `POST /api/voice/calls` — Initiate a call
- `GET /api/voice/calls` — List calls (paginated, tenant-scoped)
- `GET /api/voice/calls/[callId]` — Get call details
- `PATCH /api/voice/calls/[callId]` — Update call state
- `POST /api/voice/messages/voice` — Upload voice message
- `GET /api/voice/transcriptions/[callId]` — Get call transcriptions

**Location:** `/home/user/opsly/apps/api/app/api/voice/`

### apps/orchestrator

**Internal voice routes:**
- `POST /internal/voice/calls` — Initiate call (proxied from API)
- `GET /internal/voice/calls` — List calls
- `GET /internal/voice/calls/[callId]` — Get call details
- `PATCH /internal/voice/calls/[callId]` — Update call state
- `POST /internal/voice/messages` — Record voice message
- `GET /internal/voice/messages/[messageId]` — Get voice message
- `POST /internal/voice/transcriptions` — Submit transcription
- `GET /internal/voice/transcriptions/[callId]` — Get transcriptions

**Location:** `/home/user/opsly/apps/orchestrator/src/http/routes/voice.ts`

**Service:** `VoiceServiceLayer` at `/home/user/opsly/apps/orchestrator/src/services/voice-service.ts`

### apps/peskids

**Components:**
- `VoiceCallButton` — Button to initiate/end calls
- `VoiceCallPanel` — Full call UI with state management
- `TranscriptionDisplay` — Display call transcriptions

**Location:** `/home/user/opsly/apps/peskids/components/voice/`

## Database Schema

### calls table

```sql
CREATE TABLE calls (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calls_tenant ON calls(tenant_id);
CREATE INDEX idx_calls_state ON calls(call_state);
```

### voice_transcriptions table

```sql
CREATE TABLE voice_transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  speaker_role TEXT NOT NULL CHECK (speaker_role IN ('caller', 'recipient', 'assistant')),
  transcript_text TEXT NOT NULL,
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_voice_transcriptions_call ON voice_transcriptions(call_id);
CREATE INDEX idx_voice_transcriptions_tenant ON voice_transcriptions(tenant_id);
```

### messages table (extended)

The shared `messages` table extends with voice-specific columns:

```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_duration_seconds INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcript_confidence FLOAT;
```

## Next Steps

1. **[ACTIVATION-GUIDE.md](./ACTIVATION-GUIDE.md)** — How to activate voice calls in peskids
2. **[PROVIDER-SETUP.md](./PROVIDER-SETUP.md)** — Provider-specific setup (Twilio, WebRTC, WhatsApp API)
3. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** — Common issues and fixes

## Phase Status

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 ✅ | Complete | Voice library, Twilio provider, call state tracking |
| Phase 2 ✅ | Complete | Voice messages, transcription service, database schema |
| Phase 3 ✅ | Complete | Orchestrator handlers, API endpoints, Supabase integration |
| Phase 4 ✅ | Complete | Peskids UI components (voice call button, panel) |
| Phase 5 ✅ | Complete | N8N workflow templates |
| Phase 6 ✅ | Complete | Webhook handling, call recording URLs |
| **Phase 7** | 🚀 Current | **Activation guide & provider setup docs** |
| Phase 8 | Planned | WhatsApp API provider implementation |
| Phase 9 | Planned | Vonage provider implementation |
| Phase 10 | Planned | Advanced transcription (speaker diarization) |

## Security & RLS

All voice data is scoped to tenant via `tenant_id` field. Supabase RLS policies enforce:

```sql
-- Example: Only tenant admins can query calls for their tenant
CREATE POLICY "calls_select_for_tenant" ON calls
  FOR SELECT USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
  );
```

**Multi-tenant isolation is enforced at the database level**, not the application layer.

## Environment Variables

```bash
# Twilio (current provider)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Supabase
SUPABASE_URL=https://jkwykpldnitavhmtuzmo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Webhook callbacks
VOICE_WEBHOOK_URL=https://your-domain.com/api/voice/callbacks
```

## Related Documentation

- **[GOVERNANCE.md](/home/user/opsly/lib/voice-messaging/GOVERNANCE.md)** — Voice messaging library governance
- **[ADR-039](/home/user/opsly/docs/adr/ADR-039-sales-channels-email-whatsapp.md)** — Sales channels pattern
- **[AGENTS.md](/home/user/opsly/AGENTS.md)** — Current operations status
