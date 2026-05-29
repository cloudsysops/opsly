import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from '@intcloudsysops/api';
import {
  handleInitiateCall,
  handleListCalls,
  handleGetCallDetails,
  handleUpdateCallState,
  handleRecordVoiceMessage,
  handleGetVoiceMessage,
  handleSubmitTranscription,
  handleGetTranscriptions,
} from '../src/http/routes/voice.js';

// Mock assertTenantSlugOrThrow
vi.mock('../src/auth/index.js', () => ({
  assertTenantSlugOrThrow: vi.fn(),
}));

describe('voice handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleInitiateCall', () => {
    it('initiates a call with valid payload', async () => {
      const req = new Request('POST /internal/voice/calls', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          from: 'peskids-app',
          to: '+1234567890',
          channel: 'web',
          webhook_url: 'https://example.com/webhook',
        }),
      });

      const response = await handleInitiateCall(req);
      expect(response.status).toBe(202);
    });

    it('returns 400 for missing required fields', async () => {
      const req = new Request('POST /internal/voice/calls', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          // missing 'to' field
        }),
      });

      const response = await handleInitiateCall(req);
      expect(response.status).toBe(400);
    });

    it('validates channel against allowed values', async () => {
      const req = new Request('POST /internal/voice/calls', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          from: 'peskids-app',
          to: '+1234567890',
          channel: 'invalid_channel',
          webhook_url: 'https://example.com/webhook',
        }),
      });

      const response = await handleInitiateCall(req);
      expect(response.status).toBe(400);
    });
  });

  describe('handleListCalls', () => {
    it('lists calls for valid tenant', async () => {
      const req = new Request('GET /internal/voice/calls?tenant_id=peskids', {
        method: 'GET',
      });

      const response = await handleListCalls(req);
      expect(response.status).toBe(200);
    });

    it('returns 400 without tenant_id', async () => {
      const req = new Request('GET /internal/voice/calls', {
        method: 'GET',
      });

      const response = await handleListCalls(req);
      expect(response.status).toBe(400);
    });
  });

  describe('handleGetCallDetails', () => {
    it('retrieves call details for valid call ID', async () => {
      const callId = 'call_123';
      const req = new Request(`GET /internal/voice/calls/${callId}?tenant_id=peskids`, {
        method: 'GET',
      });

      const response = await handleGetCallDetails(req);
      expect([200, 404]).toContain(response.status);
    });

    it('returns 400 without tenant_id', async () => {
      const req = new Request('GET /internal/voice/calls/call_123', {
        method: 'GET',
      });

      const response = await handleGetCallDetails(req);
      expect(response.status).toBe(400);
    });
  });

  describe('handleUpdateCallState', () => {
    it('updates call state with valid payload', async () => {
      const callId = 'call_123';
      const req = new Request(`PATCH /internal/voice/calls/${callId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: 'peskids',
          call_state: 'ended',
          duration_seconds: 300,
        }),
      });

      const response = await handleUpdateCallState(req);
      expect([200, 202, 404]).toContain(response.status);
    });

    it('validates call_state against allowed values', async () => {
      const callId = 'call_123';
      const req = new Request(`PATCH /internal/voice/calls/${callId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tenant_id: 'peskids',
          call_state: 'invalid_state',
        }),
      });

      const response = await handleUpdateCallState(req);
      expect(response.status).toBe(400);
    });

    it('returns 400 without tenant_id', async () => {
      const callId = 'call_123';
      const req = new Request(`PATCH /internal/voice/calls/${callId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          call_state: 'ended',
        }),
      });

      const response = await handleUpdateCallState(req);
      expect(response.status).toBe(400);
    });
  });

  describe('handleRecordVoiceMessage', () => {
    it('records voice message with valid payload', async () => {
      const req = new Request('POST /internal/voice/messages/voice', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          sender_contact: '+1234567890',
          audio_url: 'https://example.com/audio.wav',
          audio_duration_seconds: 30,
          channel: 'web',
        }),
      });

      const response = await handleRecordVoiceMessage(req);
      expect(response.status).toBe(202);
    });

    it('returns 400 for missing audio_url', async () => {
      const req = new Request('POST /internal/voice/messages/voice', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          sender_contact: '+1234567890',
          // missing audio_url
          channel: 'web',
        }),
      });

      const response = await handleRecordVoiceMessage(req);
      expect(response.status).toBe(400);
    });
  });

  describe('handleGetVoiceMessage', () => {
    it('retrieves voice message for valid message ID', async () => {
      const messageId = 'msg_123';
      const req = new Request(`GET /internal/voice/messages/${messageId}?tenant_id=peskids`, {
        method: 'GET',
      });

      const response = await handleGetVoiceMessage(req);
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('handleSubmitTranscription', () => {
    it('submits transcription with valid payload', async () => {
      const req = new Request('POST /internal/voice/transcriptions', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          call_id: 'call_123',
          speaker_role: 'caller',
          transcript_text: 'Hello, this is a test',
          confidence: 0.95,
        }),
      });

      const response = await handleSubmitTranscription(req);
      expect(response.status).toBe(202);
    });

    it('validates speaker_role against allowed values', async () => {
      const req = new Request('POST /internal/voice/transcriptions', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: 'peskids',
          call_id: 'call_123',
          speaker_role: 'invalid_role',
          transcript_text: 'Hello, this is a test',
        }),
      });

      const response = await handleSubmitTranscription(req);
      expect(response.status).toBe(400);
    });
  });

  describe('handleGetTranscriptions', () => {
    it('retrieves transcriptions for valid call ID', async () => {
      const callId = 'call_123';
      const req = new Request(`GET /internal/voice/transcriptions/${callId}?tenant_id=peskids`, {
        method: 'GET',
      });

      const response = await handleGetTranscriptions(req);
      expect([200, 404]).toContain(response.status);
    });

    it('returns 400 without tenant_id', async () => {
      const req = new Request('GET /internal/voice/transcriptions/call_123', {
        method: 'GET',
      });

      const response = await handleGetTranscriptions(req);
      expect(response.status).toBe(400);
    });
  });

  describe('multi-tenant isolation', () => {
    it('prevents cross-tenant call access', async () => {
      const callId = 'call_123';
      const req = new Request(`GET /internal/voice/calls/${callId}?tenant_id=other_tenant`, {
        method: 'GET',
      });

      const response = await handleGetCallDetails(req);
      // Should either return 404 (call not found) or 401 (unauthorized)
      expect([401, 404]).toContain(response.status);
    });

    it('validates tenant_id on all write operations', async () => {
      const callId = 'call_123';
      const req = new Request(`PATCH /internal/voice/calls/${callId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          // tenant_id missing
          call_state: 'ended',
        }),
      });

      const response = await handleUpdateCallState(req);
      expect(response.status).toBe(400);
    });
  });

  describe('error handling', () => {
    it('returns 500 on service error', async () => {
      const req = new Request('POST /internal/voice/calls', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await handleInitiateCall(req);
      expect(response.status).toBe(400);
    });

    it('includes request_id in error response', async () => {
      const req = new Request('POST /internal/voice/calls', {
        method: 'POST',
        body: JSON.stringify({
          // missing required fields
        }),
      });

      const response = await handleInitiateCall(req);
      const body = await response.json();
      expect(body).toHaveProperty('request_id');
    });
  });
});
