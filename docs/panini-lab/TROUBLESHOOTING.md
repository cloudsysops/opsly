---
title: Panini Lab Troubleshooting Guide
status: published
updated: 2026-05-29
audience: Platform engineers, support team, Peskids team
---

# Troubleshooting Guide: Voice Calls & Messages

This guide covers common issues when activating and using Panini Lab voice calling.

---

## Quick Diagnosis

### Is the issue in...?

1. **Environment setup?** → [Environment & Credentials](#environment--credentials)
2. **Provider configuration?** → [Provider Issues](#provider-issues)
3. **Call initiation?** → [Call Initiation](#call-initiation)
4. **Call state updates?** → [Call State & Webhooks](#call-state--webhooks)
5. **Voice messages?** → [Voice Messages & Recording](#voice-messages--recording)
6. **Transcription?** → [Transcription Issues](#transcription-issues)
7. **Database or RLS?** → [Database & RLS](#database--rls)
8. **UI or components?** → [UI Components & Frontend](#ui-components--frontend)

---

## Environment & Credentials

### Issue: "Missing Supabase credentials"

**Error message:**
```
Error: Missing Supabase credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

**Cause:** Supabase environment variables not loaded.

**Diagnosis:**
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Load via Doppler
doppler run --project peskids --config dev -- env | grep SUPABASE
```

**Fix:**

**Option 1: Load via Doppler (recommended)**
```bash
doppler run --project peskids --config dev -- npm run dev
```

**Option 2: Export manually (dev only)**
```bash
export SUPABASE_URL="https://jkwykpldnitavhmtuzmo.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
npm run dev
```

**Option 3: Check .env.local**
```bash
# Copy example to .env.local
cp .env.example .env.local

# Use Doppler to populate
doppler run --project peskids --config dev -- cat .env.example > .env.check
cat .env.check >> .env.local
```

---

### Issue: "Missing voice provider credentials"

**Error message:**
```
Error: Missing Twilio credentials: accountSid, authToken
```

**Cause:** Twilio environment variables not set.

**Diagnosis:**
```bash
# Check Twilio credentials
doppler run --project peskids --config dev -- env | grep TWILIO

# Should show:
# TWILIO_ACCOUNT_SID=AC...
# TWILIO_AUTH_TOKEN=...
# TWILIO_PHONE_NUMBER=+1...
```

**Fix:**

```bash
# Set in Doppler
doppler secrets set --project peskids --config dev TWILIO_ACCOUNT_SID "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
doppler secrets set --project peskids --config dev TWILIO_AUTH_TOKEN "your_auth_token"
doppler secrets set --project peskids --config dev TWILIO_PHONE_NUMBER "+12345678901"

# Verify
doppler secrets get TWILIO_ACCOUNT_SID --project peskids --config dev
```

---

### Issue: "Invalid credentials in Doppler"

**Symptom:** Credentials set but validation fails.

**Diagnosis:**
```bash
# Verify exact format
doppler run --project peskids --config dev -- bash
echo "TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID"
echo "TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN"
echo "TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER"

# Trim whitespace if needed
doppler secrets set --project peskids --config dev TWILIO_ACCOUNT_SID "$(echo -n 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')"
```

**Fix:**

1. **Re-copy from Twilio Console** (don't manual-type)
   - Go to https://www.twilio.com/console
   - Click the copy icon next to Account SID
   - Paste into Doppler exactly

2. **Test with curl** (validate format)
   ```bash
   curl -u "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:your_auth_token" \
     "https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   
   # Should return JSON with account info (not 401 error)
   ```

---

## Provider Issues

### Issue: "Provider credentials invalid"

**Error message:**
```
Error: Voice provider credentials invalid
```

**Cause:** Credentials rejected by provider API.

**Diagnosis:**
```bash
# Test provider validation endpoint
curl -X POST http://localhost:3011/internal/voice/validate \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d '{"provider": "twilio"}'

# Check response:
# { "ok": false, "provider": "twilio", "valid": false, "error": "..." }
```

**Fix:**

1. **Verify credentials are correct**
   ```bash
   # Test with Twilio CLI
   twilio api:core:accounts:list
   
   # If not installed:
   npm install -g twilio-cli
   twilio plugins:install @twilio-labs/plugin-assets
   ```

2. **Check Account SID format** (must start with `AC`)
   ```bash
   doppler run --project peskids --config dev -- env | grep TWILIO_ACCOUNT_SID
   # Should output: TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Check Auth Token expiry** (rarely expires, but tokens can be invalid)
   - Regenerate in Twilio Console: **Account** → **API Keys & tokens** → **Create API Key**
   - Update in Doppler with new token

4. **Check IP allowlist** (if Twilio account has IP restrictions)
   - Disable for dev, or whitelist your IP
   - Twilio Console → **Account** → **Security** → **IP Whitelist**

---

### Issue: "Unknown voice provider"

**Error message:**
```
Error: Unknown voice provider: xyz
```

**Cause:** Provider type not registered.

**Diagnosis:**
```bash
# Check supported providers
grep "register\|VoiceProviderType" /home/user/opsly/lib/voice-messaging/src/providers/index.ts

# Currently supported:
# - twilio
# - vonage (future)
```

**Fix:**

1. **Use only supported providers**
   ```typescript
   // WRONG:
   const provider = VoiceProviderFactory.create('custom-provider', config);
   
   // CORRECT:
   const provider = VoiceProviderFactory.create('twilio', config);
   ```

2. **If adding a new provider**, register in factory:
   ```typescript
   // lib/voice-messaging/src/providers/index.ts
   VoiceProviderFactory.register('custom-provider', CustomVoiceProvider);
   ```

---

## Call Initiation

### Issue: "Failed to initiate call"

**Error message:**
```
Error: Failed to initiate call: Unauthorized
```

**Cause:** Call API rejected by provider.

**Diagnosis:**
```bash
# Check Twilio API directly
curl -X POST https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxx/Calls.json \
  -u "ACxxxxxxx:auth_token" \
  -d "From=%2B12345678901&To=%2B19999999999&Url=https%3A%2F%2Fyour-domain.com%2Fcallback"

# Check response code:
# 401 = Invalid credentials
# 400 = Invalid parameters
# 429 = Rate limited
```

**Fix:**

1. **Verify provider credentials again** (see [Provider Issues](#provider-issues))
2. **Check that "To" phone number is valid**
   ```bash
   # Must be valid E.164 format: +CountryCode + number (no spaces/hyphens)
   # Valid:   +12345678901
   # Invalid: +1 (234) 567-8901
   ```

3. **Check that "From" (Twilio number) is verified**
   - Twilio Console → **Phone Numbers** → **Manage Numbers**
   - Verify the number exists and is active

4. **Check rate limiting** (if many calls initiated quickly)
   ```bash
   # Twilio has rate limits: ~100 requests/second per account
   # Reduce call frequency or contact Twilio support for limits increase
   ```

5. **Check webhook URL is valid**
   - Must be HTTPS (not HTTP) in production
   - Must be publicly accessible
   ```bash
   curl -I https://peskids.op-sly.com/api/voice/callbacks
   # Should return 200 OK (or 405 for GET)
   ```

---

### Issue: "Call initiated but hangs in 'ringing' state"

**Symptom:** Call created with state `ringing`, but never transitions to `connected`.

**Cause:** Recipient didn't answer, or TwiML instructions missing.

**Diagnosis:**
```bash
# Check Twilio logs
tail -f logs/orchestrator.log | grep "VOICE\|ringing\|connected"

# Query database
SELECT id, call_id, call_state, started_at, ended_at, duration_seconds
FROM calls
WHERE tenant_id = 'peskids'
AND call_id = 'your_call_id';
```

**Fix:**

1. **Verify recipient answered the call** (manual test)
   - Call should ring on recipient's phone
   - Recipient must pick up for state to advance to `connected`
   - If using test number, ensure it's verified in Twilio

2. **Check TwiML configuration**
   - Twilio needs TwiML instructions to handle the call
   - Implementation should include TwiML (not just initiate)
   - Example (from `lib/voice-messaging/src/providers/twilio.ts`):
     ```typescript
     body: new URLSearchParams({
       From: this.twilioPhoneNumber,
       To: to,
       Url: webhookUrl,  // Must return valid TwiML
       Record: 'true',
     }).toString(),
     ```

3. **Set reasonable timeout**
   - Default timeout: 60 seconds
   - If recipient doesn't answer within timeout, call fails
   - Adjust in TwiML if needed:
     ```xml
     <Dial timeout="60">+1234567890</Dial>
     ```

---

## Call State & Webhooks

### Issue: "Call state update never received"

**Symptom:** Call initiated (state `ringing`), but callback webhook never fires.

**Cause:** Webhook URL unreachable, or misconfigured.

**Diagnosis:**
```bash
# Check webhook endpoint exists and is accessible
curl -v https://peskids.op-sly.com/api/voice/callbacks

# Should return:
# - 405 (Method Not Allowed for GET)
# - Or handle the request

# Check orchestrator logs for webhook errors
tail -f logs/orchestrator.log | grep -i "webhook\|callback"

# Check if webhook was actually called by Twilio
# Go to Twilio Console → Monitor → Logs → Calls
# Click on a call and view "Webhook Requests" tab
```

**Fix:**

1. **Verify webhook URL is reachable**
   ```bash
   # Test from outside (or use ngrok for local dev)
   curl -X POST https://peskids.op-sly.com/api/voice/callbacks \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'
   
   # Should not return 404 or 500
   ```

2. **Update webhook URL in Twilio Console**
   - Go to **Phone Numbers** → **Your Number**
   - Set **Voice & Fax** → **A Call Comes In** to your webhook
   - Or update TwiML App configuration
   - Must be HTTPS (not HTTP) in production

3. **For local development, use ngrok**
   ```bash
   # Start tunnel
   ngrok http 3004
   
   # Use the ngrok URL in Twilio
   # e.g., https://abc123.ngrok.io/api/voice/callbacks
   ```

4. **Check that webhook handler exists in peskids**
   - Location: `apps/peskids/app/api/voice/callbacks/route.ts`
   - Should handle POST requests
   - Should parse call state from payload

5. **Check webhook authentication** (if required)
   - Twilio includes signature header: `X-Twilio-Signature`
   - Implementation should validate (optional for dev, required for prod)

---

### Issue: "Webhook received but call state not updated in database"

**Symptom:** Logs show webhook received, but `calls` table doesn't update.

**Cause:** Database insert/update failed, or wrong tenant_id.

**Diagnosis:**
```bash
# Check orchestrator logs for database errors
tail -f logs/orchestrator.log | grep -E "error|UPDATE calls|INSERT calls"

# Query database to see what was stored
SELECT id, call_id, call_state, updated_at
FROM calls
WHERE tenant_id = 'peskids'
ORDER BY updated_at DESC LIMIT 5;

# Check if webhook payload has correct tenant_id
tail -f logs/orchestrator.log | grep "webhook" | head -5
```

**Fix:**

1. **Verify webhook payload includes tenant_id**
   ```json
   {
     "tenant_id": "peskids",
     "call_id": "call_abc123",
     "call_state": "connected",
     "started_at": "2026-05-29T12:00:00Z"
   }
   ```

2. **Check N8N workflow is correctly parsing payload**
   - Workflow: `/home/user/opsly/.n8n/1-workflows/panini/panini-call-initiated.json`
   - Should normalize call data
   - Should include `tenant_id` in normalized output

3. **Check RLS policy allows INSERT**
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'calls'
   AND policyname LIKE '%insert%';
   
   -- If no INSERT policy, webhook inserts will be blocked
   ```

4. **Check table schema matches webhook payload**
   ```sql
   -- List all columns in calls table
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'calls'
   ORDER BY ordinal_position;
   ```

---

### Issue: "Call state update succeeds but data is wrong"

**Symptom:** Webhook received and stored, but values are incorrect (duration = 0, recording_url = null).

**Cause:** Payload parsing error, or provider not populating fields.

**Diagnosis:**
```bash
# Check actual webhook payload from provider logs
tail -f logs/orchestrator.log | grep "call_state\|duration\|recording"

# Query the stored record
SELECT call_id, call_state, duration_seconds, recording_url, created_at, updated_at
FROM calls
WHERE tenant_id = 'peskids' AND call_id = 'your_call_id';
```

**Fix:**

1. **Verify Twilio sends recording URL in webhook**
   - Recording is only available after call ends
   - Twilio sends `RecordingUrl` in final webhook
   - Recording must be enabled during call initiation (default: yes)

2. **Check webhook payload mapping in orchestrator**
   ```typescript
   // apps/orchestrator/src/http/routes/voice.ts
   const webhookData = {
     call_id: payload.call_id,
     duration_seconds: payload.duration_seconds,  // May be missing
     recording_url: payload.recording_url,        // May be missing
     // ... other fields
   };
   ```

3. **Check Twilio recording status**
   ```bash
   # Twilio Console → Monitor → Logs → Calls
   # Click call → look for "Recording" section
   # If no recording, call was not recorded (check Record=true in initiation)
   ```

---

## Voice Messages & Recording

### Issue: "Voice message upload fails"

**Error message:**
```
Error: Failed to record voice message: Network error
```

**Cause:** Audio blob too large, network issue, or audio URL invalid.

**Diagnosis:**
```bash
# Check browser console for upload errors
# Look for Content-Length or network errors

# Check file size
ls -lh /path/to/audio/file.wav

# Check uploaded file exists in storage
# Twilio S3 bucket or your storage service
```

**Fix:**

1. **Check audio file size**
   - Max: 25 MB per Twilio API
   - Typical voice message: 100 KB - 5 MB (1-5 min)
   - Reduce bitrate if necessary

2. **Check audio format**
   ```bash
   # Supported: MP3, WAV, OGG, ULAW, OPUS
   # Check format:
   file audio-file.wav
   # Should output: "RIFF (little-endian) data, WAVE audio ..."
   ```

3. **Test upload with curl**
   ```bash
   curl -X POST http://localhost:3011/internal/voice/messages \
     -H "Content-Type: multipart/form-data" \
     -F "tenant_id=peskids" \
     -F "sender_contact=+1234567890" \
     -F "audio=@/path/to/audio.wav"
   ```

4. **Check Supabase storage bucket exists**
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'voice-messages';
   ```

---

### Issue: "Recording URL is empty or null"

**Symptom:** Call completes, but `recording_url` is null in database.

**Cause:** Recording not enabled, or Twilio didn't generate recording.

**Diagnosis:**
```bash
# Check call record
SELECT id, call_id, call_state, duration_seconds, recording_url
FROM calls
WHERE tenant_id = 'peskids' AND call_id = 'your_call_id';

# If duration_seconds > 0 but recording_url is null:
# 1. Recording wasn't enabled
# 2. Call was too short (< 10 seconds)
# 3. Recording failed silently on Twilio side
```

**Fix:**

1. **Enable recording in call initiation**
   ```typescript
   // lib/voice-messaging/src/providers/twilio.ts
   body: new URLSearchParams({
     From: this.twilioPhoneNumber,
     To: to,
     Url: webhookUrl,
     Record: 'true',  // MUST be 'true'
     RecordingStatusCallback: webhookUrl,  // Optional: get notified when done
   }).toString(),
   ```

2. **Wait for recording to finish**
   - Twilio processes recordings asynchronously
   - Recording URL may not be available immediately
   - Wait 2-5 seconds after call ends before querying
   - Or use `RecordingStatusCallback` webhook

3. **Check Twilio recording settings**
   - Console → Account → Settings → Recording
   - Ensure recording storage is configured
   - Check retention policy (default: 1 year)

4. **Manually trigger recording generation**
   ```bash
   # Twilio API to get recordings for a call
   curl -u "ACxxxxxxx:auth_token" \
     "https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxx/Recordings?CallSid=CA1234567890"
   
   # Response should include media_url for .wav file
   ```

---

## Transcription Issues

### Issue: "Transcription never received"

**Symptom:** Call ends, but `voice_transcriptions` table is empty.

**Cause:** Transcription not enabled, or webhook not configured.

**Diagnosis:**
```bash
# Check if transcription is enabled
grep -i "transcription\|TRANSCRIPTION" /home/user/opsly/apps/orchestrator/src/services/voice-service.ts

# Check Twilio Media Intelligence settings
# Console → Settings → Media Intelligence
# Should have "Recording Transcription" enabled

# Check transcription webhook in Twilio
# Console → Settings → Webhooks → Recording Transcription
```

**Fix:**

1. **Enable transcription in Twilio Console**
   - Go to **Console** → **Settings** → **Media Intelligence**
   - Toggle **Recording Transcription** on
   - Select language (English US, etc.)
   - Set webhook URL: `https://your-domain.com/api/voice/transcriptions`

2. **Implement transcription webhook handler**
   ```typescript
   // apps/peskids/app/api/voice/transcriptions/route.ts
   export async function POST(request: NextRequest) {
     const payload = await request.json();
     
     // Parse Twilio transcription payload
     // Store in voice_transcriptions table
     // Return 200 OK
   }
   ```

3. **Wait for transcription to complete**
   - Twilio transcription can take 5-30 seconds
   - Wait before checking database
   - Use webhook callback for real-time notification

4. **Check transcription accuracy**
   - Query with confidence threshold:
   ```sql
   SELECT transcript_text, confidence
   FROM voice_transcriptions
   WHERE tenant_id = 'peskids'
   AND confidence > 0.8;  -- Only high-confidence
   ```

---

### Issue: "Transcription is inaccurate or has low confidence"

**Symptom:** Transcription stored, but `confidence < 0.7` or text is wrong.

**Cause:** Audio quality poor, background noise, or non-English speech.

**Diagnosis:**
```bash
# Check confidence scores
SELECT call_id, transcript_text, confidence
FROM voice_transcriptions
WHERE tenant_id = 'peskids'
ORDER BY confidence ASC LIMIT 10;

# If mostly < 0.7:
# - Audio quality is poor
# - Language not English
# - Heavy background noise
```

**Fix:**

1. **Improve audio quality**
   - Use quality microphone
   - Reduce background noise
   - Ensure adequate volume (not too quiet)

2. **Set language correctly in Twilio**
   - Console → Settings → Media Intelligence
   - Select correct language for your calls
   - (Currently English US supported)

3. **Filter low-confidence transcriptions in UI**
   ```typescript
   const highConfidenceTranscripts = transcriptions.filter(t => t.confidence > 0.7);
   ```

4. **Fall back to manual transcription**
   - If confidence < 0.5, prompt staff to manually review
   - Store manual transcription separately

---

## Database & RLS

### Issue: "RLS policy blocks voice operations"

**Error message:**
```
Error: new row violates row-level security policy "calls_insert_tenant"
```

**Cause:** RLS policy doesn't match `tenant_id` in webhook.

**Diagnosis:**
```bash
# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'calls';

# Check if tenant_id in call matches policy
SELECT call_id, tenant_id FROM calls WHERE call_id = 'your_call_id';
```

**Fix:**

1. **Verify RLS policy allows writes for tenant**
   ```sql
   -- Check policy definition
   SELECT schemaname, tablename, policyname, qual, with_check
   FROM pg_policies
   WHERE tablename = 'calls';
   
   -- Should have something like:
   -- with_check: (tenant_id = auth.jwt() ->> 'tenant_id')
   ```

2. **Check JWT token includes correct tenant_id**
   ```bash
   # Decode JWT from Authorization header
   # JWT should have: { "tenant_id": "peskids", ... }
   
   # Test with service role key (bypasses RLS for testing)
   curl -X POST https://jkwykpldnitavhmtuzmo.supabase.co/rest/v1/calls \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"tenant_id": "peskids", "call_id": "test", ...}'
   ```

3. **Temporarily disable RLS for testing** (dev only)
   ```sql
   -- DANGER: Only for development!
   ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
   
   -- Re-enable after testing
   ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
   ```

---

### Issue: "Calls table is empty despite initiating calls"

**Symptom:** Calls are initiated, but database has no records.

**Cause:** N8N workflow not running, or database insert is failing silently.

**Diagnosis:**
```bash
# Check N8N workflow status
n8n_url="http://n8n:5678"  # VPS container
curl "$n8n_url/api/v1/workflows?name=panini-call-initiated"

# Check workflow logs in N8N UI
# Or check application logs
tail -f logs/orchestrator.log | grep "panini\|N8N"

# Query database directly
SELECT COUNT(*) FROM calls WHERE tenant_id = 'peskids';
```

**Fix:**

1. **Verify N8N workflow is active**
   ```bash
   # SSH to VPS
   ssh vps-dragon@100.120.151.91
   
   # Check n8n container
   docker ps | grep n8n
   
   # View workflow
   curl http://localhost:5678/api/v1/workflows?name=panini-call-initiated
   ```

2. **Check workflow execution history**
   - n8n UI → Workflows → `panini-call-initiated`
   - View recent executions
   - Look for errors in output

3. **Manually trigger workflow** (for testing)
   ```bash
   curl -X POST http://localhost:5678/api/v1/workflows/WORKFLOW_ID/execute \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'
   ```

---

## UI Components & Frontend

### Issue: "VoiceCallButton not rendering"

**Symptom:** Component doesn't appear in UI, or renders but disabled.

**Cause:** Props invalid, or component not imported.

**Diagnosis:**
```bash
# Check browser console for errors
# Look for: "VoiceCallButton: missing tenantId" etc.

# Check component is imported
grep -r "VoiceCallButton" /home/user/opsly/apps/peskids/
```

**Fix:**

1. **Verify component import**
   ```typescript
   import { VoiceCallButton } from '@/components/voice/voice-call-button';
   ```

2. **Provide required props**
   ```typescript
   <VoiceCallButton
     tenantId="peskids"  // REQUIRED
     recipientContact="+1234567890"  // REQUIRED
     channel="web"  // Optional, default: 'web'
   />
   ```

3. **Check component path**
   - Location: `/home/user/opsly/apps/peskids/components/voice/voice-call-button.tsx`
   - Verify file exists
   - Check export is named: `export function VoiceCallButton`

---

### Issue: "Call button initiates but no response"

**Symptom:** Click button, state changes to `isCalling`, but no response.

**Cause:** API endpoint unreachable, or timeout.

**Diagnosis:**
```bash
# Check browser Network tab
# Should see POST request to /internal/voice/calls
# Check response status and body

# Test endpoint directly
curl -X POST http://localhost:3011/internal/voice/calls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -d '{"tenant_id": "peskids", "to": "+1234567890", ...}'
```

**Fix:**

1. **Verify orchestrator is running**
   ```bash
   curl http://localhost:3011/health
   # Should return 200 OK
   ```

2. **Check BEARER_TOKEN is valid**
   ```bash
   # Get from JWT token (user session)
   # Should include tenant_id: 'peskids'
   
   # Check in environment
   echo $NEXT_PUBLIC_BEARER_TOKEN
   ```

3. **Verify API endpoint exists**
   - Location: `/home/user/opsly/apps/orchestrator/src/http/routes/voice.ts`
   - Should have `POST /internal/voice/calls` handler

4. **Check CORS if calling from different origin**
   ```javascript
   // Verify CORS headers in response
   // Or use server-side proxy in peskids API
   ```

---

### Issue: "Call state doesn't update in UI in real-time"

**Symptom:** Call initiated, but UI doesn't show state changes (`ringing` → `connected` → `ended`).

**Cause:** Missing polling, websocket, or state management.

**Diagnosis:**
```bash
# Check database directly (workaround)
SELECT call_state FROM calls WHERE call_id = 'your_call_id';

# Compare with UI display
# If database has 'connected' but UI shows 'ringing':
# UI is not polling or WebSocket not connected
```

**Fix:**

1. **Implement polling** (simple approach)
   ```typescript
   // pages/voice-call.tsx
   useEffect(() => {
     const interval = setInterval(async () => {
       const response = await fetch(`/api/voice/calls/${callId}`);
       const call = await response.json();
       setCallState(call.call_state);
     }, 1000);  // Poll every 1 second
     
     return () => clearInterval(interval);
   }, [callId]);
   ```

2. **Implement WebSocket** (real-time approach)
   ```typescript
   // Subscribe to call updates via WebSocket
   const ws = new WebSocket('wss://your-domain.com/ws/voice/calls');
   ws.onmessage = (e) => {
     const call = JSON.parse(e.data);
     setCallState(call.call_state);
   };
   ```

3. **Use SWR or React Query** (declarative approach)
   ```typescript
   const { data: call } = useSWR(`/api/voice/calls/${callId}`, fetcher, {
     refreshInterval: 1000,  // Poll every 1 second
   });
   ```

---

## Performance & Rate Limiting

### Issue: "Rate limit exceeded (429)"

**Error message:**
```
Error: Too many requests: 429 Conflict
```

**Cause:** Too many calls initiated too quickly.

**Diagnosis:**
```bash
# Check Twilio rate limits
# Twilio: ~100 requests/second per account

# Check your call frequency
SELECT COUNT(*) as calls_per_second
FROM calls
WHERE tenant_id = 'peskids'
AND created_at > now() - interval '1 second';
```

**Fix:**

1. **Add exponential backoff**
   ```typescript
   async function initiateCallWithRetry(options, attempt = 0) {
     try {
       return await initiateCall(options);
     } catch (error) {
       if (error.status === 429 && attempt < 3) {
         await new Promise(resolve => 
           setTimeout(resolve, Math.pow(2, attempt) * 1000)
         );
         return initiateCallWithRetry(options, attempt + 1);
       }
       throw error;
     }
   }
   ```

2. **Queue calls** (using BullMQ)
   ```typescript
   const voiceQueue = new Queue('voice-calls', {
     connection: redis,
   });
   
   await voiceQueue.add('initiate', { to, channel }, {
     delay: 1000 * Math.random(),  // Stagger calls
   });
   ```

3. **Contact Twilio support** to increase limits (if legitimate high volume)

---

## General Debugging Tips

### Enable verbose logging

```bash
# Set debug environment variable
DEBUG=*:voice npm run dev

# Or in code:
process.env.DEBUG = 'voice:*';
```

### Check all logs

```bash
# Peskids app logs
tail -f logs/peskids.log | grep -i voice

# Orchestrator logs
tail -f logs/orchestrator.log | grep -i voice

# N8N logs
docker logs <n8n_container> | grep -i voice

# Twilio logs (Console → Monitor → Logs)
```

### Database query helper

```sql
-- View all voice-related tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%voice%' OR table_name LIKE '%call%';

-- Check recent calls
SELECT id, call_id, call_state, created_at, updated_at, error_message
FROM calls
WHERE tenant_id = 'peskids'
ORDER BY created_at DESC
LIMIT 20;

-- Check recent transcriptions
SELECT id, call_id, transcript_text, confidence, created_at
FROM voice_transcriptions
WHERE tenant_id = 'peskids'
ORDER BY created_at DESC
LIMIT 10;
```

### Test API endpoints

```bash
# Test orchestrator voice routes
curl http://localhost:3011/internal/voice/calls \
  -H "Authorization: Bearer ${TOKEN}"

# Test peskids API
curl http://localhost:3004/api/voice/calls \
  -H "Authorization: Bearer ${TOKEN}"

# Tail logs in real-time
tail -f logs/*.log | grep -E "voice|VOICE|Error|ERROR"
```

---

## Contact Support

If you can't resolve the issue:

1. **Check logs** — Always start with logs
2. **Check this guide** — Most common issues covered
3. **Check provider docs**
   - [Twilio API Reference](https://www.twilio.com/docs/voice/api)
   - [Twilio Troubleshooting](https://www.twilio.com/docs/voice/troubleshooting)
4. **Contact team**
   - Slack: @cloud-sys-ops-team
   - GitHub: Create issue in `cloudsysops/opsly`

---

## Related Documentation

- **[ACTIVATION-GUIDE.md](./ACTIVATION-GUIDE.md)** — How to activate voice
- **[PROVIDER-SETUP.md](./PROVIDER-SETUP.md)** — Provider configuration
- **[OVERVIEW.md](./OVERVIEW.md)** — Architecture reference
