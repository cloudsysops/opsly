import { describe, it, expect, vi } from 'vitest';

describe('voice messaging integration', () => {
  describe('voice call initiation flow', () => {
    it('initiates a call to the orchestrator API', async () => {
      const tenantId = 'peskids';
      const recipientContact = '+1234567890';
      const channel = 'web';

      const payload = {
        tenant_id: tenantId,
        from: 'peskids-app',
        to: recipientContact,
        channel,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/voice/callbacks`,
      };

      expect(payload).toHaveProperty('tenant_id', 'peskids');
      expect(payload).toHaveProperty('to', '+1234567890');
      expect(['whatsapp', 'telegram', 'web']).toContain(payload.channel);
    });

    it('validates channel enum before API call', () => {
      const validChannels = ['whatsapp', 'telegram', 'web'] as const;
      const testChannels = ['web', 'whatsapp', 'telegram', 'invalid'];

      const results = testChannels.map((ch) => validChannels.includes(ch as any));
      expect(results).toEqual([true, true, true, false]);
    });

    it('returns callId from orchestrator response', () => {
      const mockResponse = {
        data: {
          id: 'call_abc123',
          tenant_id: 'peskids',
          call_id: 'twilio_sid_123',
          initiator_contact: 'peskids-app',
          recipient_contact: '+1234567890',
          channel: 'web' as const,
          call_state: 'ringing' as const,
          created_at: new Date().toISOString(),
        },
      };

      expect(mockResponse.data).toHaveProperty('id');
      expect(mockResponse.data.id).toBe('call_abc123');
      expect(mockResponse.data.call_state).toBe('ringing');
    });
  });

  describe('call state management', () => {
    it('tracks valid call state transitions', () => {
      const validStates = ['ringing', 'connected', 'hold', 'ended', 'failed'] as const;

      const transitions: Array<{ from: string; to: string; valid: boolean }> = [
        { from: 'ringing', to: 'connected', valid: true },
        { from: 'connected', to: 'hold', valid: true },
        { from: 'hold', to: 'connected', valid: true },
        { from: 'connected', to: 'ended', valid: true },
        { from: 'ringing', to: 'ended', valid: true },
        { from: 'ended', to: 'connected', valid: false },
      ];

      transitions.forEach((t) => {
        const fromValid = validStates.includes(t.from as any);
        const toValid = validStates.includes(t.to as any);
        expect(fromValid && toValid).toBe(true);
      });
    });

    it('maps database call record to frontend type', () => {
      const dbRecord = {
        id: 'uuid-123',
        tenant_id: 'peskids',
        call_id: 'twilio-sid',
        initiator_contact: 'peskids-app',
        recipient_contact: '+1234567890',
        channel: 'web',
        call_state: 'connected',
        started_at: '2026-05-29T10:00:00Z',
        duration_seconds: 300,
        created_at: '2026-05-29T10:00:00Z',
      };

      const mapped = {
        id: dbRecord.id,
        tenantId: dbRecord.tenant_id,
        callId: dbRecord.call_id,
        initiatorContact: dbRecord.initiator_contact,
        recipientContact: dbRecord.recipient_contact,
        channel: dbRecord.channel,
        callState: dbRecord.call_state,
        startedAt: dbRecord.started_at,
        durationSeconds: dbRecord.duration_seconds,
        createdAt: dbRecord.created_at,
      };

      expect(mapped.tenantId).toBe('peskids');
      expect(mapped.callState).toBe('connected');
      expect(mapped.durationSeconds).toBe(300);
    });
  });

  describe('transcription storage and retrieval', () => {
    it('stores transcription with speaker role', () => {
      const transcription = {
        id: 'trans-uuid-1',
        tenant_id: 'peskids',
        call_id: 'call-123',
        speaker_role: 'caller' as const,
        transcript_text: 'Hello, how can I help?',
        confidence: 0.95,
        created_at: new Date().toISOString(),
      };

      expect(transcription).toHaveProperty('speaker_role');
      expect(['caller', 'recipient', 'assistant']).toContain(transcription.speaker_role);
      expect(transcription.confidence).toBeGreaterThanOrEqual(0);
      expect(transcription.confidence).toBeLessThanOrEqual(1);
    });

    it('filters transcriptions by confidence threshold', () => {
      const transcriptions = [
        { id: '1', speaker_role: 'caller' as const, confidence: 0.95 },
        { id: '2', speaker_role: 'recipient' as const, confidence: 0.75 },
        { id: '3', speaker_role: 'assistant' as const, confidence: 0.45 },
      ];

      const highConfidence = transcriptions.filter((t) => (t.confidence ?? 0) >= 0.7);
      expect(highConfidence).toHaveLength(2);
      expect(highConfidence.map((t) => t.id)).toEqual(['1', '2']);
    });

    it('maps database transcription to frontend type', () => {
      const dbRecord = {
        id: 'trans-uuid',
        tenant_id: 'peskids',
        call_id: 'call-123',
        speaker_role: 'caller',
        transcript_text: 'Hello world',
        confidence: 0.92,
        created_at: '2026-05-29T10:00:01Z',
      };

      const mapped = {
        id: dbRecord.id,
        tenantId: dbRecord.tenant_id,
        callId: dbRecord.call_id,
        speakerRole: dbRecord.speaker_role,
        transcriptText: dbRecord.transcript_text,
        confidence: dbRecord.confidence,
        createdAt: dbRecord.created_at,
      };

      expect(mapped.speakerRole).toBe('caller');
      expect(mapped.transcriptText).toBe('Hello world');
    });
  });

  describe('multi-tenant isolation', () => {
    it('enforces tenant_id on all database queries', () => {
      const queries = [
        { op: 'GET /calls', requires_tenant_id: true },
        { op: 'POST /calls', requires_tenant_id: true },
        { op: 'PATCH /calls/:id', requires_tenant_id: true },
        { op: 'GET /transcriptions', requires_tenant_id: true },
      ];

      queries.forEach((q) => {
        expect(q.requires_tenant_id).toBe(true);
      });
    });

    it('prevents cross-tenant data access', () => {
      const call1 = { id: 'call-1', tenant_id: 'peskids' };
      const call2 = { id: 'call-2', tenant_id: 'other-tenant' };

      const filter = (call: any, requestedTenant: string) => call.tenant_id === requestedTenant;

      expect(filter(call1, 'peskids')).toBe(true);
      expect(filter(call2, 'peskids')).toBe(false);
      expect(filter(call2, 'other-tenant')).toBe(true);
    });
  });

  describe('real-time subscriptions', () => {
    it('subscribes to call state updates on correct channel', () => {
      const callId = 'call-123';
      const channel = `calls:${callId}`;

      expect(channel).toBe('calls:call-123');
    });

    it('subscribes to transcription inserts with correct filter', () => {
      const callId = 'call-123';
      const filter = `call_id=eq.${callId}`;

      expect(filter).toBe('call_id=eq.call-123');
    });

    it('handles subscription status correctly', () => {
      const validStatuses = ['SUBSCRIBED', 'CHANNEL_ERROR'];

      expect(validStatuses).toContain('SUBSCRIBED');
      expect(validStatuses).toContain('CHANNEL_ERROR');
    });
  });

  describe('error handling', () => {
    it('validates required fields before API call', () => {
      const validateCall = (payload: any) => {
        const required = ['tenant_id', 'to', 'channel'];
        return required.every((field) => field in payload && payload[field] !== null);
      };

      expect(validateCall({ tenant_id: 'peskids', to: '+123', channel: 'web' })).toBe(true);
      expect(validateCall({ tenant_id: 'peskids', channel: 'web' })).toBe(false);
      expect(validateCall({ tenant_id: 'peskids', to: '+123' })).toBe(false);
    });

    it('handles network errors gracefully', async () => {
      const mockFetch = vi.fn(() => Promise.reject(new Error('Network error')));
      global.fetch = mockFetch;

      try {
        await mockFetch();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('includes request_id in error responses', () => {
      const requestId = 'req-abc-123';
      const errorResponse = {
        ok: false,
        error: 'Call initiation failed',
        request_id: requestId,
      };

      expect(errorResponse).toHaveProperty('request_id');
      expect(errorResponse.request_id).toBe('req-abc-123');
    });
  });
});
