# Voice Messaging Library (@intcloudsysops/voice-messaging)

Modular voice + chat library supporting calls, voice messages, recording, and analytics across WhatsApp, Telegram, and web platforms.

## Features

- **Voice Calls**: Real-time calling with state tracking (ringing → connected → ended)
- **Voice Messages**: Audio file recordings with optional transcription
- **Multi-Platform**: WhatsApp, Telegram, Web (WebRTC)
- **Recording**: Automatic call recording with URL storage
- **Analytics**: Call duration, participant tracking, transcription confidence scores
- **Multi-tenant**: Built-in tenant isolation via RLS policies
- **Provider-Agnostic**: Start with Twilio, extend to Vonage or WhatsApp API

## Quick Start

### Installation

This module is part of the Opsly monorepo. Import from `@intcloudsysops/voice-messaging`:

```typescript
import {
  BaseVoiceProvider,
  VoiceProviderFactory,
  TwilioVoiceProvider,
  CallManager,
  VoiceMessagesService,
  TranscriptionService,
} from '@intcloudsysops/voice-messaging';
```

### Initialize Twilio Provider

```typescript
const provider = VoiceProviderFactory.create('twilio', {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
});

// Validate credentials
const isValid = await provider.validateCredentials();
```

### Create a Call

```typescript
const call = await provider.initiateCall({
  tenantId: 'peskids',
  from: 'alice@example.com',
  to: '+1234567890',
  channel: 'whatsapp',
  webhookUrl: 'https://example.com/webhooks/voice/calls',
});

console.log(`Call initiated: ${call.callId} → ${call.callState}`);
```

### Record a Voice Message

```typescript
const voiceMessage = await provider.recordVoiceMessage({
  tenantId: 'peskids',
  senderContact: '+1234567890',
  senderName: 'Alice',
  audioBlob: audioFile, // Blob from <input type="file" />
  channel: 'whatsapp',
  webhookUrl: 'https://example.com/webhooks/voice/messages',
});

console.log(`Voice message recorded: ${voiceMessage.audioUrl}`);
```

### Handle Webhooks

```typescript
// Call state webhook
const call = await provider.handleCallStateWebhook({
  tenantId: 'peskids',
  callId: 'call_123',
  externalCallId: 'CA1234567890',
  from: '+1234567890',
  to: '+0987654321',
  state: 'ended',
  durationSeconds: 300,
  channel: 'whatsapp',
  recordingUrl: 'https://recordings.twilio.com/xyz.wav',
});

// Transcription webhook
const transcription = await provider.handleTranscriptionWebhook({
  tenantId: 'peskids',
  callId: 'call_123',
  externalCallId: 'CA1234567890',
  transcript: 'Hello, how can I help you?',
  confidence: 0.95,
  speakerRole: 'caller',
});
```

## Services

### CallManager

Manages call lifecycle in Supabase:

```typescript
const callManager = new CallManager({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

// Create call record
await callManager.createCall(call);

// Update call state
await callManager.updateCallState('peskids', 'call_123', 'connected');

// End call with duration and recording
await callManager.endCall('peskids', 'call_123', 300, 'https://recordings.twilio.com/xyz.wav');

// Get call details
const callDetails = await callManager.getCall('peskids', 'call_123');

// List tenant calls
const calls = await callManager.getCallsByTenant('peskids', 50);
```

### VoiceMessagesService

Manages voice message storage:

```typescript
const messagesService = new VoiceMessagesService({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

// Create voice message record
await messagesService.createVoiceMessage(voiceMessage);

// Update transcription
await messagesService.updateVoiceMessageTranscript(
  'peskids',
  'msg_456',
  'Hello, how are you?',
  0.92
);

// Get messages by contact
const messages = await messagesService.getVoiceMessagesByContact(
  'peskids',
  '+1234567890',
  20
);
```

### TranscriptionService

Manages call transcriptions:

```typescript
const transcriptionService = new TranscriptionService({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

// Create transcription
await transcriptionService.createTranscription(transcription);

// Get transcriptions for a call
const callTranscriptions = await transcriptionService.getTranscriptionsByCall(
  'peskids',
  'call_123'
);

// Get summary of entire call
const summary = await transcriptionService.getCallTranscriptSummary(
  'peskids',
  'call_123'
);
```

## API Endpoints

The library integrates with `apps/api` via these endpoints:

### Calls

- `POST /api/voice/calls` — Initiate a call
- `GET /api/voice/calls` — List calls (paginated)
- `GET /api/voice/calls/[callId]` — Get call details
- `PATCH /api/voice/calls/[callId]` — Update call state

### Voice Messages

- `POST /api/voice/messages/voice` — Upload voice message

### Transcriptions

- `GET /api/voice/transcriptions/[callId]` — Get call transcriptions

## Database Schema

### calls table

```sql
id UUID PRIMARY KEY
tenant_id TEXT NOT NULL
call_id TEXT NOT NULL UNIQUE
initiator_contact TEXT NOT NULL
recipient_contact TEXT NOT NULL
channel TEXT ('whatsapp' | 'telegram' | 'web')
call_state TEXT ('ringing' | 'connected' | 'hold' | 'ended' | 'failed')
started_at TIMESTAMPTZ
ended_at TIMESTAMPTZ
duration_seconds INT
recording_url TEXT
recording_id TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### voice_transcriptions table

```sql
id UUID PRIMARY KEY
tenant_id TEXT NOT NULL
call_id UUID FOREIGN KEY → calls.id
speaker_role TEXT ('caller' | 'recipient' | 'assistant')
transcript_text TEXT
confidence FLOAT (0.0-1.0)
timestamp TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### messages table (extended)

- `audio_url TEXT` — URL to voice message audio
- `audio_duration_seconds INT` — Length of voice message
- `transcript TEXT` — Auto-transcription of voice message

## Adding a New Provider

Extend `BaseVoiceProvider`:

```typescript
export class VonageVoiceProvider extends BaseVoiceProvider {
  provider = 'vonage';

  async initiateCall(options: InitiateCallOptions): Promise<Call> {
    // Vonage API integration
  }

  async endCall(tenantId: string, callId: string): Promise<void> {
    // Vonage API
  }

  async recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage> {
    // Vonage API
  }

  async transcribeCall(options: TranscribeCallOptions): Promise<VoiceTranscription> {
    // Vonage API
  }

  async handleCallStateWebhook(payload: Record<string, unknown>): Promise<Call> {
    // Map Vonage webhook to Call
  }

  async handleVoiceMessageWebhook(payload: Record<string, unknown>): Promise<VoiceMessage> {
    // Map Vonage webhook to VoiceMessage
  }

  async handleTranscriptionWebhook(payload: Record<string, unknown>): Promise<VoiceTranscription> {
    // Map Vonage webhook to VoiceTranscription
  }

  async validateCredentials(): Promise<boolean> {
    // Test Vonage credentials
  }
}
```

Register provider:

```typescript
VoiceProviderFactory.register('vonage', VonageVoiceProvider);

// Use it
const vonageProvider = VoiceProviderFactory.create('vonage', {
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
});
```

## Testing

### Unit Tests

```bash
npm run test -- lib/voice-messaging
```

### Integration Tests

Tests use mocked Twilio client and real Supabase staging instance.

### End-to-End Tests

Test via peskids portal:

1. Initiate call from UI
2. Verify call state in `calls` table
3. Record voice message
4. Verify audio upload and metadata
5. View transcription in UI

## Environment Variables

```bash
# Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Supabase
SUPABASE_URL=https://jkwykpldnitavhmtuzmo.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Vonage (when provider added)
VONAGE_API_KEY=...
VONAGE_API_SECRET=...
```

## Known Limitations

- Audio upload is placeholder (needs S3/Supabase Storage integration)
- Audio duration calculation is estimated
- Transcription is stubbed (needs real Twilio API integration)
- No webhook retry logic
- No idempotency keys

## Related Documentation

- [GOVERNANCE.md](./GOVERNANCE.md) — Module governance and change policy
- [CLAUDE.md](../../.claude/CLAUDE.md) — Project guidelines
- [ADR-039](../../docs/adr/ADR-039-sales-channels-email-whatsapp.md) — Sales channels pattern

## Contributing

Changes to this module require approval from @cloud-sys-ops-team. See [GOVERNANCE.md](./GOVERNANCE.md) for change policy and code standards.
