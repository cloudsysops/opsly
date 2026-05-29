import { describe, expect, it, vi } from 'vitest';
import { geminiTranscribeMedia } from '../src/gemini-transcribe.js';

vi.mock('../src/structured-log.js', () => ({
  logGatewayEvent: vi.fn(),
}));

describe('geminiTranscribeMedia', () => {
  it('returns transcription text from mocked Gemini', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (href.includes('example.com/audio')) {
        return new Response(Buffer.from('fake-audio'), {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      }
      if (href.includes('generativelanguage.googleapis.com')) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Tengo la figurita 45 repetida' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const result = await geminiTranscribeMedia({
      mediaUrl: 'https://example.com/audio.mp3',
      mediaType: 'audio',
      apiKey: 'test-key',
      fetchImpl,
    });

    expect(result.text).toContain('figurita 45');
    expect(result.model).toBeTruthy();
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    await expect(
      geminiTranscribeMedia({
        mediaUrl: 'https://example.com/audio.mp3',
        mediaType: 'audio',
        apiKey: '',
      }),
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
