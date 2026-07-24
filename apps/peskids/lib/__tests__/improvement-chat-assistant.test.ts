import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeImprovementMessage } from '@/lib/improvement-chat-assistant';

describe('analyzeImprovementMessage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.LLM_GATEWAY_URL = 'http://127.0.0.1:3010';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('parses a well-formed LLM classification response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: JSON.stringify({
          category: 'feature',
          priority: 'alta',
          summary: 'Recordatorios de clase por WhatsApp',
          actionable: true,
          reply: 'Gracias, quedó registrado.',
        }),
      }),
    }) as unknown as typeof fetch;

    const result = await analyzeImprovementMessage(
      'Sería genial poder mandar recordatorios de clase por WhatsApp'
    );

    expect(result.category).toBe('feature');
    expect(result.priority).toBe('alta');
    expect(result.actionable).toBe(true);
    expect(result.from_llm).toBe(true);
    expect(result.reply).toContain('registrado');
  });

  it('falls back gracefully when the LLM returns malformed JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'not json at all' }),
    }) as unknown as typeof fetch;

    const result = await analyzeImprovementMessage('Otra sugerencia de mejora');

    expect(result.from_llm).toBe(false);
    expect(result.category).toBe('other');
    expect(result.priority).toBe('media');
  });

  it('falls back gracefully when the LLM gateway is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const result = await analyzeImprovementMessage('Otra sugerencia de mejora');

    expect(result.from_llm).toBe(false);
    expect(result.category).toBe('other');
  });

  it('returns a safe fallback without calling the gateway for empty input', async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await analyzeImprovementMessage('   ');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.from_llm).toBe(false);
  });

  it('defaults to "other"/"media" when the LLM returns an unknown category or priority', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: JSON.stringify({
          category: 'not_a_real_category',
          priority: 'urgentísima',
          summary: 'algo',
          actionable: false,
          reply: 'ok',
        }),
      }),
    }) as unknown as typeof fetch;

    const result = await analyzeImprovementMessage('Mensaje de prueba');

    expect(result.category).toBe('other');
    expect(result.priority).toBe('media');
    expect(result.actionable).toBe(false);
  });
});
