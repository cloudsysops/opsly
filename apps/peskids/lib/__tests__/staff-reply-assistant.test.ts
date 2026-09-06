import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateStaffReplySuggestion } from '@/lib/staff-reply-assistant';

describe('generateStaffReplySuggestion', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    process.env.LLM_GATEWAY_URL = 'http://127.0.0.1:3010';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects empty input without calling the gateway', async () => {
    const result = await generateStaffReplySuggestion({ inboundMessageText: '   ' });
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the drafted reply from the LLM gateway', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'Gracias por escribirnos, con gusto te ayudamos.' }),
    });

    const result = await generateStaffReplySuggestion({
      inboundMessageText: '¿Tienen clases para bebés de 6 meses?',
      senderName: 'Laura',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reply).toBe('Gracias por escribirnos, con gusto te ayudamos.');
      expect(result.from_llm).toBe(true);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:3010/v1/text');
    const body = JSON.parse(init.body as string);
    expect(body.feature).toBe('peskids_staff_reply_suggestion');
    expect(body.prompt).toContain('Laura');
    expect(body.prompt).toContain('¿Tienen clases para bebés de 6 meses?');
  });

  it('falls back gracefully when the gateway is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('connection refused'));

    const result = await generateStaffReplySuggestion({ inboundMessageText: 'Hola' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.from_llm).toBe(false);
      expect(result.reply.length).toBeGreaterThan(0);
    }
  });

  it('falls back gracefully when the gateway responds with an error status', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const result = await generateStaffReplySuggestion({ inboundMessageText: 'Hola' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.from_llm).toBe(false);
    }
  });
});
