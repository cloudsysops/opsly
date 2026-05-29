---
title: Panini Lab Provider Setup Guide
status: published
updated: 2026-05-29
audience: Platform engineers, DevOps, Peskids team
---

# Provider Setup Guide: Voice Call Providers

This guide covers how to set up and configure each voice provider for Panini Lab.

**Current Providers:**
- ✅ **Twilio** (production-ready)
- 🚀 **WhatsApp API** (roadmap - Phase 8)
- 🚀 **Vonage** (roadmap - Phase 9)

---

## Twilio (Current Production Provider)

### Overview

Twilio provides:
- **Outbound calling** via REST API
- **Call state webhooks** (ringing, connected, ended)
- **Call recording** (automatic)
- **Transcription** (via Twilio Media Intelligence)
- **Multi-country support**

### Prerequisites

1. **Twilio Account** — Create at https://www.twilio.com
2. **Verified phone number(s)** — For initiating calls
3. **Doppler project** — For secrets management
4. **Webhook endpoint** — Your peskids app callback URL

### Setup Steps

#### 1. Create Twilio Account

1. Sign up at https://www.twilio.com/console/signup
2. Complete phone number verification
3. Purchase a phone number for outbound calls:
   - Go to **Console** → **Phone Numbers** → **Buy a Number**
   - Select country and area code
   - Add to cart and complete purchase
4. Verify callback numbers (test recipients):
   - Go to **Verified Caller IDs**
   - Add numbers you will test with (your mobile, etc.)

#### 2. Obtain Credentials

1. In Twilio Console, go to **Account** → **API Keys & tokens**
2. Copy the following:
   - **Account SID** — Found in Console header (format: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** — Found in Console header
   - **Phone Number** — The number you purchased (format: `+1234567890`)

**Example credentials:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12345678901
```

#### 3. Store Credentials in Doppler

Using Doppler for secure secret management:

```bash
# Login to Doppler
doppler login

# Set secrets for peskids project
doppler secrets set --project peskids --config dev TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
doppler secrets set --project peskids --config dev TWILIO_AUTH_TOKEN "your_auth_token_here"
doppler secrets set --project peskids --config dev TWILIO_PHONE_NUMBER "+12345678901"

# Verify secrets were set
doppler secrets get TWILIO_ACCOUNT_SID --project peskids --config dev
```

**Never commit these secrets to git.** Always use Doppler for production.

#### 4. Configure Webhook URL

Twilio must send call state updates to your peskids application. Configure the webhook:

1. In Twilio Console, go to **Studio** or **TwiML Apps**
2. Create or edit your TwiML App
3. Set **Voice: Request URL** to:
   ```
   https://peskids.op-sly.com/api/voice/callbacks
   ```
4. Set **Request method** to `POST`
5. Save

**For local development**, use a tunnel:
```bash
# Install ngrok
npm install -g ngrok

# Start tunnel to localhost:3004
ngrok http 3004

# Use the provided URL (e.g., https://abc123.ngrok.io) in Twilio console
# Set callback URL to: https://abc123.ngrok.io/api/voice/callbacks
```

#### 5. Test Credentials

Verify your setup with a test call:

```bash
# Load Doppler secrets
doppler run --project peskids --config dev -- bash

# Test with curl
curl -X POST http://localhost:3011/internal/voice/validate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{
    "provider": "twilio",
    "account_sid": "'$TWILIO_ACCOUNT_SID'",
    "auth_token": "'$TWILIO_AUTH_TOKEN'",
    "phone_number": "'$TWILIO_PHONE_NUMBER'"
  }'

# Expected response:
# { "ok": true, "provider": "twilio", "valid": true }
```

#### 6. Enable Call Recording

Twilio automatically records calls when initiated with `Record=true` (default in implementation).

To configure recording storage:
1. Go to **Console** → **Settings** → **Recording**
2. Choose storage: Twilio S3 bucket or your own AWS S3
3. Configure retention policy (default: 1 year)

**Recording URLs are stored in the `calls` table:**
```sql
SELECT id, call_id, recording_url, duration_seconds
FROM calls
WHERE tenant_id = 'peskids' AND recording_url IS NOT NULL;
```

#### 7. Enable Transcription (Optional)

Twilio Media Intelligence provides automatic transcription.

1. Go to **Console** → **Settings** → **Media Intelligence**
2. Enable **Recording Transcription**
3. Choose language: English (US) or other
4. Set webhook for transcription completion

**Transcription webhook payload:**
```json
{
  "tenantId": "peskids",
  "callId": "call_abc123",
  "externalCallId": "TWILIO_SID",
  "transcript": "Hello, this is the call transcript...",
  "confidence": 0.95,
  "speakerRole": "caller"
}
```

**Handler in orchestrator** (`apps/orchestrator/src/http/routes/voice.ts`):
```typescript
POST /internal/voice/transcriptions
Body: {
  tenantId: string;
  callId: string;
  externalCallId: string;
  transcript: string;
  confidence?: number;
  speakerRole: 'caller' | 'recipient' | 'assistant';
}
```

### Pricing

| Feature | Cost | Usage |
|---------|------|-------|
| Outbound call | $0.013/min | Per minute of call |
| Inbound call | Free | For inbound (not used in Peskids) |
| Recording storage | $0.5/month per GB | Automatic |
| Transcription | $0.05/min | Optional, per minute |

**Estimated monthly cost for Peskids (10 calls/day, 5 min average):**
- Calls: 10 × 5 × 30 × $0.013 = ~$19.50
- Recording: ~$2/month
- **Total: ~$22/month**

### Monitoring & Logs

Check Twilio logs for call activity:

1. **In Twilio Console:**
   - Go to **Monitor** → **Logs** → **Calls**
   - Filter by date, phone number, or status

2. **In your app (Supabase):**
   ```sql
   SELECT * FROM calls
   WHERE tenant_id = 'peskids'
   AND created_at > now() - interval '24 hours'
   ORDER BY created_at DESC;
   ```

3. **In orchestrator logs:**
   ```bash
   tail -f logs/orchestrator.log | grep "TWILIO\|voice"
   ```

### Troubleshooting Twilio

**Issue: "Invalid Account SID"**
- Check: Account SID in Doppler matches Twilio Console
- Action: Re-copy from Console (copy icon, not the full header text)

**Issue: "Call initiated but no state update received"**
- Check: Webhook URL is accessible from Twilio
  ```bash
  curl -v https://peskids.op-sly.com/api/voice/callbacks
  ```
- Check: Twilio TwiML App webhook is configured
- Action: Enable Twilio request logging (Console → Monitor → Logs)

**Issue: "Recording URL is null"**
- Check: Recording is enabled in implementation (default: yes)
- Check: Call was recorded (call_state = 'ended' and duration > 0)
- Action: Manual trigger transcription (see TROUBLESHOOTING.md)

---

## WhatsApp API (Roadmap - Phase 8)

**Status:** Under development

### Overview

WhatsApp API enables:
- **Voice calls** via WhatsApp Business account
- **Direct integration** with WhatsApp infrastructure
- **No additional gateway** (compared to Baileys)
- **Enhanced reliability** for enterprise messaging

### Prerequisites (Future)

1. **Meta Business Account** (formerly Facebook Business Manager)
2. **WhatsApp Business Account** (verified)
3. **Phone number registration** with Meta
4. **Official API access** (apply at https://developers.facebook.com)

### Setup Steps (Placeholder)

```bash
# Future provider will support:
WHATSAPP_API_TOKEN=your_meta_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

**Provider implementation:** `lib/voice-messaging/src/providers/whatsapp.ts` (planned)

**Activation:**
```typescript
const provider = VoiceProviderFactory.create('whatsapp', {
  apiToken: process.env.WHATSAPP_API_TOKEN,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
});
```

---

## Vonage (Roadmap - Phase 9)

**Status:** Under development

### Overview

Vonage (formerly Nexmo) provides:
- **SIP trunking** for enterprise calling
- **Multi-country** phone number provisioning
- **Competitive pricing** for high-volume calling
- **Advanced call routing** capabilities

### Prerequisites (Future)

1. **Vonage Account** (https://dashboard.nexmo.com)
2. **API Key & Secret**
3. **Vonage phone number**

### Setup Steps (Placeholder)

```bash
# Future provider will support:
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
VONAGE_PHONE_NUMBER=your_phone_number
```

**Provider implementation:** `lib/voice-messaging/src/providers/vonage.ts` (planned)

**Activation:**
```typescript
const provider = VoiceProviderFactory.create('vonage', {
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  phoneNumber: process.env.VONAGE_PHONE_NUMBER,
});
```

---

## Adding a New Provider

To add a new voice provider to Panini Lab:

### 1. Implement BaseVoiceProvider

Create `lib/voice-messaging/src/providers/your-provider.ts`:

```typescript
import {
  Call,
  VoiceMessage,
  VoiceTranscription,
  InitiateCallOptions,
  RecordVoiceMessageOptions,
  TranscribeCallOptions,
} from '../types.js';
import { BaseVoiceProvider } from './index.js';

export class YourVoiceProvider extends BaseVoiceProvider {
  provider = 'your-provider';
  private apiKey: string;
  private apiSecret: string;
  private phoneNumber: string;

  constructor(config: Record<string, unknown>) {
    super();
    this.apiKey = config.apiKey as string;
    this.apiSecret = config.apiSecret as string;
    this.phoneNumber = config.phoneNumber as string;

    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Missing credentials: apiKey, apiSecret');
    }
  }

  async initiateCall(options: InitiateCallOptions): Promise<Call> {
    // Implement call initiation logic
    // Must return Call with id, tenantId, callState: 'ringing'
    throw new Error('Not implemented');
  }

  async endCall(tenantId: string, callId: string): Promise<void> {
    // Implement call termination
    throw new Error('Not implemented');
  }

  async recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage> {
    // Implement voice message recording
    throw new Error('Not implemented');
  }

  async transcribeCall(options: TranscribeCallOptions): Promise<VoiceTranscription> {
    // Implement call transcription
    throw new Error('Not implemented');
  }

  async handleCallStateWebhook(payload: Record<string, unknown>): Promise<Call> {
    // Parse provider webhook and return normalized Call
    throw new Error('Not implemented');
  }

  async handleVoiceMessageWebhook(payload: Record<string, unknown>): Promise<VoiceMessage> {
    // Parse provider webhook and return normalized VoiceMessage
    throw new Error('Not implemented');
  }

  async handleTranscriptionWebhook(payload: Record<string, unknown>): Promise<VoiceTranscription> {
    // Parse provider webhook and return normalized VoiceTranscription
    throw new Error('Not implemented');
  }

  async validateCredentials(): Promise<boolean> {
    // Test credentials by making an API call
    // Return true if valid, false otherwise
    throw new Error('Not implemented');
  }
}
```

### 2. Register Provider

Update `lib/voice-messaging/src/providers/index.ts`:

```typescript
import { YourVoiceProvider } from './your-provider.js';

type VoiceProviderType = 'twilio' | 'vonage' | 'your-provider';  // Add here

// In VoiceProviderFactory class:
export class VoiceProviderFactory {
  static {
    // Register providers on module load
    this.register('twilio', TwilioVoiceProvider);
    this.register('your-provider', YourVoiceProvider);
  }
  // ... rest of factory
}
```

### 3. Update Library Exports

Edit `lib/voice-messaging/src/index.ts`:

```typescript
export { YourVoiceProvider } from './providers/your-provider.js';
```

### 4. Add Environment Variables

Update Doppler and `.env.example`:

```bash
# .env.example
YOUR_PROVIDER_API_KEY=your_api_key
YOUR_PROVIDER_API_SECRET=your_api_secret
YOUR_PROVIDER_PHONE_NUMBER=+1234567890
```

### 5. Test Provider

Create test file `lib/voice-messaging/__tests__/your-provider.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { YourVoiceProvider } from '../src/providers/your-provider.js';

describe('YourVoiceProvider', () => {
  it('initializes with valid credentials', () => {
    const provider = new YourVoiceProvider({
      apiKey: 'test_key',
      apiSecret: 'test_secret',
      phoneNumber: '+1234567890',
    });

    expect(provider.provider).toBe('your-provider');
  });

  it('validates credentials', async () => {
    const provider = new YourVoiceProvider({
      apiKey: 'test_key',
      apiSecret: 'test_secret',
      phoneNumber: '+1234567890',
    });

    // Mock API call
    const isValid = await provider.validateCredentials();
    expect(isValid).toBe(true);
  });

  // ... more tests
});
```

### 6. Activate in Orchestrator

Update `apps/orchestrator/src/services/voice-service.ts`:

```typescript
export class VoiceServiceLayer {
  async initiateCall(options: InitiateCallOptions): Promise<Call> {
    const providerType = process.env.VOICE_PROVIDER_TYPE || 'twilio';
    
    const provider = VoiceProviderFactory.create(providerType, {
      // Configuration varies by provider
      // Load from Doppler/environment
    });

    // ... rest of method
  }
}
```

### 7. Documentation

Add provider section to this document with:
- Overview of features
- Setup prerequisites
- Step-by-step configuration
- Pricing estimates
- Troubleshooting tips

---

## Provider Comparison Matrix

| Feature | Twilio | WhatsApp API | Vonage |
|---------|--------|--------------|--------|
| **Status** | ✅ Production | 🚀 Roadmap | 🚀 Roadmap |
| **Outbound Calls** | Yes | Yes | Yes |
| **Call Recording** | Yes (automatic) | Yes | Yes |
| **Transcription** | Yes (paid) | Yes | Yes |
| **Channel Support** | SMS, Voice, WhatsApp | WhatsApp only | SMS, Voice |
| **Multi-country** | 180+ countries | Global | 180+ countries |
| **Setup Difficulty** | Easy | Medium | Medium |
| **Pricing (calls)** | $0.013/min | TBD | $0.005–0.02/min |
| **Developer Support** | Excellent | Good | Good |

---

## Related Documentation

- **[ACTIVATION-GUIDE.md](./ACTIVATION-GUIDE.md)** — How to activate voice in peskids
- **[OVERVIEW.md](./OVERVIEW.md)** — Architecture and module reference
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** — Common issues and solutions

## Support

For issues:
- Check Twilio Console logs: **Monitor** → **Logs** → **Calls**
- Check orchestrator logs: `tail -f logs/orchestrator.log | grep voice`
- Review implementation: `/home/user/opsly/lib/voice-messaging/src/providers/twilio.ts`
- Contact: @cloud-sys-ops-team (Slack)
