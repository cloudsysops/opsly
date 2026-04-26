import { beforeEach, describe, expect, it, vi } from 'vitest';

const llmCallDirectMock = vi.hoisted(() => vi.fn());

vi.mock('../src/llm-direct.js', () => ({
  llmCallDirect: (...args: unknown[]) => llmCallDirectMock(...args),
}));

import { scoreQuality } from '../src/quality-scorer.js';

describe('quality-scorer', () => {
  beforeEach(() => {
    llmCallDirectMock.mockReset();
  });

  it('parsea score 0-100 desde JSON Haiku', async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: '{"score": 88, "breakdown": "Cubre el pedido y respeta TS"}',
    });
    const r = await scoreQuality('t1', 'pedido', 'constraints', 'respuesta');
    expect(r.score).toBe(88);
    expect(r.breakdown).toContain('Cubre');
  });

  it('clampa score fuera de rango', async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: '{"score": 150}',
    });
    const r = await scoreQuality('t1', 'p', 'c', 'r');
    expect(r.score).toBe(100);
  });

  it('fallback 70 si JSON inválido', async () => {
    llmCallDirectMock.mockResolvedValueOnce({
      content: 'not json',
    });
    const r = await scoreQuality('t1', 'p', 'c', 'r');
    expect(r.score).toBe(70);
    expect(r.breakdown).toContain('fallback');
  });

  it('fallback 70 si Haiku falla', async () => {
    llmCallDirectMock.mockRejectedValueOnce(new Error('timeout'));
    const r = await scoreQuality('t1', 'p', 'c', 'r');
    expect(r.score).toBe(70);
  });
});
