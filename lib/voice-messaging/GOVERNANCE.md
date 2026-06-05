# Voice Messaging Module Governance

## Overview
`@intcloudsysops/voice-messaging` is a modular voice + chat library supporting calls, voice messages, recording, and analytics across WhatsApp, Telegram, and web platforms.

## Maintainers
- Primary: @cloud-sys-ops-team
- Secondary: Opsly Architects

## Change Policy

### Non-Breaking Changes (Auto-approve)
- Adding new voice providers (Vonage, WhatsApp API, etc.)
- Adding new webhook handlers
- Improving existing provider implementations
- Adding new types/interfaces that don't affect exports

### Breaking Changes (Require Review)
- Changing BaseVoiceProvider interface
- Renaming types or exports
- Changing service constructor signatures
- Database schema changes affecting backwards compatibility

### Security/Bug Fixes
- Require one approval from maintainers
- Can be merged with fast-track process

## Code Standards

### Provider Implementation
All voice providers must implement `BaseVoiceProvider` interface:

```typescript
class MyVoiceProvider extends BaseVoiceProvider {
  async initiateCall(options: InitiateCallOptions): Promise<Call>;
  async endCall(tenantId: string, callId: string): Promise<void>;
  async recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage>;
  async transcribeCall(options: TranscribeCallOptions): Promise<VoiceTranscription>;
  async handleCallStateWebhook(payload: Record<string, unknown>): Promise<Call>;
  async handleVoiceMessageWebhook(payload: Record<string, unknown>): Promise<VoiceMessage>;
  async handleTranscriptionWebhook(payload: Record<string, unknown>): Promise<VoiceTranscription>;
  async validateCredentials(): Promise<boolean>;
}
```

### Multi-tenant Isolation
- All queries must include `tenant_id` filter
- No data leakage between tenants
- Test multi-tenant isolation in every provider implementation

### Type Safety
- No `any` types allowed
- All webhook payloads must be typed
- Extend types.ts before implementing providers

### Testing
- Unit tests for provider abstractions
- Mock Twilio client for testing (use credentials from test config)
- Integration tests with real Supabase instance (on staging)
- End-to-end tests in consuming apps (peskids, etc.)

## Known Issues & TODOs

### Current Limitations
- Audio upload placeholder (needs S3/Supabase Storage integration)
- Audio duration calculation is estimated (needs proper metadata extraction)
- Transcription is stubbed (needs Twilio API integration)
- No retry logic on webhook failures

### Future Enhancements
- [ ] Add Vonage provider implementation
- [ ] Add WhatsApp Voice API provider
- [ ] Implement real S3/Supabase Storage upload
- [ ] Add call quality metrics (JITTER, MOS)
- [ ] Add multi-party conference call support
- [ ] Add call recording encryption
- [ ] Implement webhook idempotency keys
- [ ] Add webhook retry logic with exponential backoff

## Dependencies
- Peer: `@supabase/supabase-js` (^2.0.0)
- Peer: `twilio` (^4.0.0)

## Related Documentation
- CLAUDE.md: Main project guidelines
- lib/README.md: Library module patterns
- ADR-039: Sales channels integration patterns

## Review Checklist

When adding new providers or features:
- [ ] Types are properly defined in types.ts
- [ ] Provider extends BaseVoiceProvider
- [ ] All webhooks are handled
- [ ] Multi-tenant isolation enforced
- [ ] Unit tests written
- [ ] Error handling implemented
- [ ] Credentials validation implemented
- [ ] Documentation updated

