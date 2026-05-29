---
title: Panini Lab Activation Guide — Peskids
status: published
updated: 2026-05-29
audience: Peskids team, platform engineers
---

# Activation Guide: Voice Calls in Peskids

This guide walks you through activating voice calls in the Peskids platform, from environment setup to testing the end-to-end flow.

## Prerequisites

Before activating voice calls, ensure you have:

1. **Supabase access** — Peskids uses shared Supabase project `jkwykpldnitavhmtuzmo`
2. **Doppler credentials** — Access to `peskids` project with `dev` config
3. **Node.js 18+** and npm
4. **A voice provider** — See [PROVIDER-SETUP.md](./PROVIDER-SETUP.md) for provider-specific requirements

---

## Phase 1: Environment Setup

### 1.1 Verify Supabase Schema

Ensure the voice-specific tables exist in your Supabase project:

```bash
# Using Supabase CLI
npx supabase migration list --project-id jkwykpldnitavhmtuzmo

# Should see migrations:
# - 001_voice_calls_table.sql
# - 002_voice_transcriptions_table.sql
# - 003_messages_voice_columns.sql
```

**If migrations are missing**, apply them:

```bash
npx supabase migration up --project-id jkwykpldnitavhmtuzmo
```

### 1.2 Load Secrets via Doppler

Peskids stores all voice provider credentials in Doppler. Load environment variables:

```bash
# View available secrets
doppler run --project peskids --config dev -- echo "Secrets loaded"

# Or, export to .env for local development
doppler secrets download --project peskids --config dev --no-file > .env.voice.local
```

**Required secrets** (provider-specific, see [PROVIDER-SETUP.md](./PROVIDER-SETUP.md)):

```bash
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### 1.3 Start Development Servers

Start the Opsly stack with Peskids:

```bash
# From /home/user/opsly root
npm install

# Start all services (docker-compose)
npm run dev

# Or, start individual services:
npm run dev --workspace=@intcloudsysops/orchestrator  # Port 3011
npm run dev --workspace=@intcloudsysops/api          # Port 3000
npm run dev --workspace=peskids                      # Port 3004
```

**Verify services are running:**

```bash
curl http://localhost:3000/health      # API
curl http://localhost:3004              # Peskids portal
curl http://localhost:3011/health       # Orchestrator
```

---

## Phase 2: Activate Voice Provider

### 2.1 Initialize Provider in Orchestrator

The orchestrator must initialize the voice provider on startup. Edit `/home/user/opsly/apps/orchestrator/src/services/voice-service.ts`:

```typescript
import { VoiceProviderFactory } from '@intcloudsysops/voice-messaging';

export class VoiceServiceLayer {
  private provider: BaseVoiceProvider;

  constructor() {
    // Initialize Twilio provider with env vars
    this.provider = VoiceProviderFactory.create('twilio', {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    });
  }

  async initiateCall(options: InitiateCallOptions): Promise<Call> {
    // Validate credentials on first call
    const isValid = await this.provider.validateCredentials();
    if (!isValid) {
      throw new Error('Voice provider credentials invalid');
    }

    return this.provider.initiateCall(options);
  }

  // ... rest of service
}
```

### 2.2 Verify Provider Credentials

Test your provider credentials:

```bash
# Curl the orchestrator to validate
curl -X POST http://localhost:3011/internal/voice/validate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{}'

# Response (if valid):
# { "ok": true, "provider": "twilio", "valid": true }
```

### 2.3 Test Call Initiation

Use the Peskids portal to test a call:

1. Navigate to **Admin Dashboard** → **Voice Testing**
2. Enter a test phone number (e.g., your mobile)
3. Click **Initiate Call**
4. Observe the call state transition in real-time

**Or, test via curl:**

```bash
curl -X POST http://localhost:3004/api/voice/calls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -d '{
    "from": "peskids-app",
    "to": "+1234567890",
    "channel": "whatsapp"
  }'

# Response:
# {
#   "ok": true,
#   "data": {
#     "id": "call_abc123",
#     "tenantId": "peskids",
#     "callState": "ringing",
#     "createdAt": "2026-05-29T12:00:00Z"
#   }
# }
```

---

## Phase 3: Activate in Peskids Portal

### 3.1 Import Voice Components

In your peskids page or component, import the voice call button:

```typescript
// pages/admin/dashboard.tsx
import { VoiceCallButton } from '@/components/voice/voice-call-button';

export default function AdminDashboard() {
  return (
    <div>
      <h1>Support Panel</h1>
      
      <VoiceCallButton
        tenantId="peskids"
        recipientContact="+1234567890"
        recipientName="Parent Contact"
        channel="whatsapp"
        onCallInitiated={(callId) => console.log(`Call initiated: ${callId}`)}
        onCallEnded={(callId) => console.log(`Call ended: ${callId}`)}
        onError={(error) => console.error('Call error:', error)}
      />
    </div>
  );
}
```

### 3.2 Add Voice Call Panel

For a more complete UI experience, use the `VoiceCallPanel`:

```typescript
import { VoiceCallPanel } from '@/components/voice/voice-call-panel';

export default function MessageThread() {
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [contactPhone, setContactPhone] = useState('+1234567890');

  return (
    <div>
      <button onClick={() => setShowVoicePanel(!showVoicePanel)}>
        Toggle Voice Call
      </button>

      {showVoicePanel && (
        <VoiceCallPanel
          tenantId="peskids"
          contactPhone={contactPhone}
          channel="whatsapp"
          onClose={() => setShowVoicePanel(false)}
        />
      )}
    </div>
  );
}
```

### 3.3 Handle Voice Callbacks

Set up webhook handler in peskids API to handle call state changes:

```typescript
// apps/peskids/app/api/voice/callbacks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VoiceServiceLayer } from '@intcloudsysops/voice-messaging';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Determine payload type (call state, voice message, transcription)
    if (payload.call_id && payload.call_state) {
      // Call state update
      const service = new VoiceServiceLayer();
      await service.updateCallState('peskids', payload.call_id, {
        callState: payload.call_state,
        durationSeconds: payload.duration_seconds,
        recordingUrl: payload.recording_url,
      });

      return NextResponse.json({ ok: true, received: true });
    }

    if (payload.audio_url) {
      // Voice message received
      const service = new VoiceServiceLayer();
      await service.recordVoiceMessage({
        tenantId: 'peskids',
        senderContact: payload.sender_contact,
        senderName: payload.sender_name,
        audioUrl: payload.audio_url,
        channel: payload.channel,
        audioDurationSeconds: payload.audio_duration_seconds,
      });

      return NextResponse.json({ ok: true, received: true });
    }

    if (payload.transcript_text) {
      // Transcription received
      const service = new VoiceServiceLayer();
      await service.submitTranscription({
        tenantId: 'peskids',
        callId: payload.call_id,
        speakerRole: payload.speaker_role,
        transcriptText: payload.transcript_text,
        confidence: payload.confidence,
      });

      return NextResponse.json({ ok: true, received: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown payload type' }, { status: 400 });
  } catch (error) {
    console.error('Voice callback error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## Phase 4: N8N Workflow Integration

### 4.1 Create Voice Call Trigger Workflow

Set up an N8N workflow to trigger voice calls when specific conditions are met (e.g., hot lead, urgent follow-up):

**Workflow: `peskids-voice-hot-lead-alert`**

1. **Trigger:** PostgreSQL polling (every 5 min)
   - Query: SELECT * FROM leads WHERE status = 'hot_alert_pending'

2. **Process:** JavaScript node
   - Extract phone number from lead record
   - Prepare call initiation payload

3. **Action:** HTTP request
   - POST to `http://orchestrator:3011/internal/voice/calls`
   - Body:
     ```json
     {
       "tenant_id": "peskids",
       "from": "{{ owner_name }}",
       "to": "{{ lead.phone }}",
       "channel": "whatsapp",
       "webhook_url": "https://peskids.op-sly.com/api/voice/callbacks"
     }
     ```

4. **Update:** Mark lead as processed
   - UPDATE leads SET voice_alert_sent_at = now() WHERE id = {{ lead.id }}

### 4.2 Handle Voice Message Received

Create a workflow to process incoming voice messages from WhatsApp:

**Workflow: `peskids-voice-message-receiver`**

1. **Trigger:** Webhook
   - Path: `peskids-voice-message`

2. **Parse:** Extract audio metadata (duration, sender, channel)

3. **Transcribe:** Call Twilio Transcription API (or similar)
   - Pass `audio_url` to transcription service

4. **Store:** Create message record in Supabase
   - INSERT into messages (channel, sender_contact, audio_url, transcript, ...)

5. **Notify:** Alert staff if transcript contains keywords (urgent, error, escalate)

---

## Phase 5: Testing & Validation

### 5.1 Unit Tests

Run voice messaging library tests:

```bash
npm run test -- lib/voice-messaging

# Output should show:
# ✓ TwilioVoiceProvider initiateCall
# ✓ TwilioVoiceProvider endCall
# ✓ CallManager createCall
# ✓ CallManager updateCallState
# ... etc
```

### 5.2 Integration Tests

Test the full flow: API → Orchestrator → Provider → Database

```bash
# Manual test
npm run dev --workspace=peskids

# In browser:
# 1. Open http://localhost:3004/admin/support
# 2. Click "Call Parent" button
# 3. Verify call state in Supabase: SELECT * FROM calls ORDER BY created_at DESC LIMIT 1;
# 4. Verify webhook received (check logs)
```

### 5.3 End-to-End Tests

Test with real phone numbers (if using Twilio):

1. **Initiate call** to a real mobile number
2. **Answer on mobile** — verify you hear the call
3. **Record conversation** — check recording URL in calls table
4. **Verify transcription** — check voice_transcriptions table for text
5. **End call** — verify call_state = 'ended' and duration_seconds populated

### 5.4 Webhook Verification

Ensure webhooks from provider are correctly parsed and stored:

```bash
# Monitor orchestrator logs
tail -f logs/orchestrator.log | grep "voice"

# Should see:
# [VOICE] Received call state update: call_abc123 → connected
# [VOICE] Stored transcription: confidence 0.95
```

---

## Phase 6: Monitoring & Debugging

### 6.1 Check Voice Metrics

Query Supabase for voice call statistics:

```sql
-- Total calls today
SELECT COUNT(*), call_state, channel 
FROM calls 
WHERE tenant_id = 'peskids' 
  AND created_at > now() - interval '1 day'
GROUP BY call_state, channel;

-- Average call duration
SELECT AVG(duration_seconds) as avg_duration_seconds, channel
FROM calls
WHERE tenant_id = 'peskids' AND call_state = 'ended'
GROUP BY channel;

-- Transcription accuracy
SELECT AVG(confidence) as avg_confidence, COUNT(*) as total
FROM voice_transcriptions
WHERE tenant_id = 'peskids';
```

### 6.2 Common Issues & Fixes

**Issue: "Provider credentials invalid"**

```bash
# Check Doppler secrets
doppler secrets get TWILIO_ACCOUNT_SID --project peskids --config dev

# Re-deploy with correct credentials
npm run deploy -- --workspace peskids
```

**Issue: "Call initiated but no state update received"**

```bash
# Verify webhook URL is accessible from provider
curl -v https://peskids.op-sly.com/api/voice/callbacks

# Check orchestrator logs for webhook errors
tail -f logs/orchestrator.log | grep -i "webhook\|error"
```

**Issue: "Transcription is empty or low confidence"**

```bash
# Check transcription service logs
tail -f logs/transcription.log

# Verify audio URL is accessible
curl -I https://recordings.twilio.com/abc123.wav
```

---

## Provider Configuration Checklist

- [ ] Provider credentials loaded via Doppler
- [ ] Webhook URL configured in provider console
- [ ] Provider credentials validated (`validateCredentials()` returns true)
- [ ] Test call initiated from peskids portal
- [ ] Call state received and stored in Supabase
- [ ] Recording URL populated
- [ ] Transcription generated or submitted
- [ ] N8N workflows created for voice events
- [ ] Monitoring dashboard displays voice metrics
- [ ] Error alerts configured for failed calls

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed issue diagnosis.

## Next Steps

1. **[PROVIDER-SETUP.md](./PROVIDER-SETUP.md)** — Detailed setup for your chosen provider
2. **[OVERVIEW.md](./OVERVIEW.md)** — Architecture and module reference
3. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** — Common issues and solutions

## Support

For issues or questions:
- Check logs: `tail -f logs/{service}.log`
- Review orchestrator handlers: `/home/user/opsly/apps/orchestrator/src/http/routes/voice.ts`
- Reference library types: `/home/user/opsly/lib/voice-messaging/src/types.ts`
- Contact: @cloud-sys-ops-team (Slack)
