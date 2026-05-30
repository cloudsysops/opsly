import { describe, expect, it, vi } from 'vitest';
import { createGatewayTranscriptionPort } from '../src/adapters/gateway-transcription.js';

describe('createGatewayTranscriptionPort', () => {
  it('calls llm-gateway /v1/transcribe for audio', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ ok: true, text: 'figurita 12 nueva' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;

    const port = createGatewayTranscriptionPort({
      baseUrl: 'http://gateway.test',
      fetchImpl,
    });

    const text = await port.processAudio({
      tenantSlug: 'panini-lab',
      mediaUrl: 'https://cdn.test/audio.ogg',
      mediaType: 'audio',
      requestId: 'req-1',
    });

    expect(text).toBe('figurita 12 nueva');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://gateway.test/v1/transcribe',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
