import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as postInitiateCall } from '../calls/route';
import { PATCH as patchUpdateCall } from '../calls/[callId]/route';
import { POST as postVoiceMessage } from '../messages/voice/route';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { proxyRuntimeOrchestrator } from '../../../../lib/runtime-proxy';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { extractIp, logAuditEvent } from '../../../../lib/audit';

vi.mock('../../../../lib/auth', () => ({
  requireAdminAccessUnlessDemoRead: vi.fn(),
}));

vi.mock('../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: vi.fn(),
}));

vi.mock('../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../lib/audit', () => ({
  extractIp: vi.fn(),
  logAuditEvent: vi.fn(),
}));

describe('Voice Endpoints Security & Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/voice/calls (Initiate Call)', () => {
    it('returns 401 when auth check fails', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(
        new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      );

      const request = new Request('http://localhost/api/voice/calls', {
        method: 'POST',
        body: JSON.stringify({ from: '+1234567890', to: '+0987654321', channel: 'web' }),
      });

      const response = await postInitiateCall(request);
      expect(response.status).toBe(401);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(extractIp).mockReturnValue('127.0.0.1');
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new Request('http://localhost/api/voice/calls', {
        method: 'POST',
        body: JSON.stringify({ from: '+1234567890', to: '+0987654321', channel: 'web' }),
      });

      const response = await postInitiateCall(request);
      expect(response.status).toBe(429);
      const json = await response.json();
      expect(json.error).toBe('Too many requests');
      expect(checkRateLimit).toHaveBeenCalledWith('voice-calls-initiate:127.0.0.1');
    });

    it('proxies to orchestrator and logs audit event on success', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(extractIp).mockReturnValue('127.0.0.1');
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });
      vi.mocked(proxyRuntimeOrchestrator).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const request = new Request('http://localhost/api/voice/calls', {
        method: 'POST',
        body: JSON.stringify({ from: '+1234567890', to: '+0987654321', channel: 'web' }),
      });

      const response = await postInitiateCall(request);
      expect(response.status).toBe(200);
      expect(proxyRuntimeOrchestrator).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'voice_call_initiate',
          resource: 'voice:calls:+1234567890:+0987654321',
          ip: '127.0.0.1',
        })
      );
    });
  });

  describe('PATCH /api/voice/calls/[callId] (Update Call State)', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(extractIp).mockReturnValue('127.0.0.1');
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new Request('http://localhost/api/voice/calls/call-123', {
        method: 'PATCH',
        body: JSON.stringify({ state: 'connected' }),
      });

      const response = await patchUpdateCall(request, {
        params: Promise.resolve({ callId: 'call-123' }),
      });
      expect(response.status).toBe(429);
      expect(checkRateLimit).toHaveBeenCalledWith('voice-calls-update:127.0.0.1');
    });

    it('proxies to orchestrator and logs audit event on success', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(extractIp).mockReturnValue('127.0.0.1');
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });
      vi.mocked(proxyRuntimeOrchestrator).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const request = new Request('http://localhost/api/voice/calls/call-123', {
        method: 'PATCH',
        body: JSON.stringify({ state: 'connected' }),
      });

      const response = await patchUpdateCall(request, {
        params: Promise.resolve({ callId: 'call-123' }),
      });
      expect(response.status).toBe(200);
      expect(proxyRuntimeOrchestrator).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'voice_call_update_state',
          resource: 'voice:calls:call-123',
          ip: '127.0.0.1',
          metadata: {
            callId: 'call-123',
            state: 'connected',
          },
        })
      );
    });
  });

  describe('POST /api/voice/messages/voice (Post Voice Message)', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(extractIp).mockReturnValue('127.0.0.1');
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new Request('http://localhost/api/voice/messages/voice', {
        method: 'POST',
      });

      const response = await postVoiceMessage(request);
      expect(response.status).toBe(429);
      expect(checkRateLimit).toHaveBeenCalledWith('voice-message-post:127.0.0.1');
    });

    it('proxies to orchestrator and logs audit event on success', async () => {
      vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
      vi.mocked(extractIp).mockReturnValue('127.0.0.1');
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });
      vi.mocked(proxyRuntimeOrchestrator).mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const formData = new FormData();
      formData.append('audio', new Blob(['test-audio-data'], { type: 'audio/wav' }));
      formData.append('senderContact', '+1234567890');
      formData.append('senderName', 'John Doe');
      formData.append('channel', 'whatsapp');

      const request = new Request('http://localhost/api/voice/messages/voice', {
        method: 'POST',
        body: formData,
      });

      const response = await postVoiceMessage(request);
      expect(response.status).toBe(200);
      expect(proxyRuntimeOrchestrator).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'voice_message_post',
          resource: 'voice:messages:+1234567890',
          ip: '127.0.0.1',
          metadata: {
            senderContact: '+1234567890',
            senderName: 'John Doe',
            channel: 'whatsapp',
          },
        })
      );
    });
  });
});
