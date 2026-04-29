import { describe, expect, it, beforeEach, vi } from 'vitest';
import { embedText, embedTexts } from '../src/embeddings.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('embeddings batch optimization', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set API key for tests
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('single text uses direct API call (no queueing overhead)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array(1536).fill(0.1) }],
      }),
    });

    const result = await embedText('test');
    expect(result).toBeDefined();
    expect(result?.length).toBe(1536);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('batch of texts returns array of embeddings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { embedding: Array(1536).fill(0.1) },
          { embedding: Array(1536).fill(0.2) },
          { embedding: Array(1536).fill(0.3) },
        ],
      }),
    });

    const texts = ['text1', 'text2', 'text3'];
    const results = await embedTexts(texts);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r && r.length === 1536)).toBe(true);
  });

  it('handles batch larger than max batch size (50)', async () => {
    const texts = Array(100)
      .fill(0)
      .map((_, i) => `text${i}`);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: Array(50)
          .fill(0)
          .map(() => ({ embedding: Array(1536).fill(0.5) })),
      }),
    });

    const results = await embedTexts(texts);

    expect(results).toHaveLength(100);
    expect(results.every((r) => r && r.length === 1536)).toBe(true);
    // Should make 2 requests (50 + 50)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('truncates long texts to 8000 chars', async () => {
    const longText = 'x'.repeat(10000);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array(1536).fill(0.1) }],
      }),
    });

    await embedText(longText);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.input[0].length).toBe(8000);
  });

  it('returns null array on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const results = await embedTexts(['text1', 'text2']);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r === null)).toBe(true);
  });

  it('returns null when no API key set', async () => {
    process.env.OPENAI_API_KEY = '';

    const result = await embedText('test');

    expect(result).toBeNull();
  });

  it('handles malformed embeddings gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array(100).fill(0.1) }], // Wrong size
      }),
    });

    const result = await embedText('test');

    expect(result).toBeNull();
  });

  it('reduces API calls for identical consecutive requests', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ embedding: Array(1536).fill(0.1) }],
      }),
    });

    const texts = ['dup', 'dup', 'dup'];
    await embedTexts(texts);

    // Should batch all 3 into 1 request
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
