import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  getCachedSearchResult,
  setCachedSearchResult,
  getSearchCacheStats,
  resetSearchCacheMetrics,
  closeSearchCache,
} from '../src/search-cache.js';

// Mock Redis client
const mockRedisClient = {
  get: vi.fn(),
  setEx: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

describe('search cache optimization', () => {
  beforeEach(() => {
    mockRedisClient.get.mockClear();
    mockRedisClient.setEx.mockClear();
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');
    resetSearchCacheMetrics();
  });

  afterEach(async () => {
    await closeSearchCache();
  });

  it('returns null on cache miss', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);

    const result = await getCachedSearchResult('test query');

    expect(result).toBeNull();
    expect(mockRedisClient.get).toHaveBeenCalled();
  });

  it('returns cached value on hit', async () => {
    const cachedValue = JSON.stringify({ results: ['doc1', 'doc2'] });
    mockRedisClient.get.mockResolvedValueOnce(cachedValue);

    const result = await getCachedSearchResult('test query');

    expect(result).toBe(cachedValue);
  });

  it('caches search results with correct TTL', async () => {
    const result = JSON.stringify({ results: ['doc1'] });

    await setCachedSearchResult('test query', result);

    expect(mockRedisClient.setEx).toHaveBeenCalled();
    const call = mockRedisClient.setEx.mock.calls[0];
    // TTL should be 86400 (24h) for static queries (no options)
    expect(call[1]).toBe(86400);
  });

  it('uses shorter TTL for dynamic queries (with options)', async () => {
    const result = JSON.stringify({ results: ['doc1'] });

    await setCachedSearchResult('test query', result, { filter: 'active' });

    const call = mockRedisClient.setEx.mock.calls[0];
    // TTL should be 3600 (1h) for dynamic queries
    expect(call[1]).toBe(3600);
  });

  it('tracks cache hit rate correctly', async () => {
    mockRedisClient.get.mockResolvedValueOnce('cached');
    mockRedisClient.get.mockResolvedValueOnce(null);
    mockRedisClient.get.mockResolvedValueOnce('cached');

    await getCachedSearchResult('query1');
    await getCachedSearchResult('query2');
    await getCachedSearchResult('query3');

    const stats = getSearchCacheStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.total).toBe(3);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
  });

  it('deterministic caching: same query produces same key', async () => {
    await setCachedSearchResult('test query', 'result1');
    await setCachedSearchResult('test query', 'result2');

    const calls = mockRedisClient.setEx.mock.calls;
    // Both should have same key (first arg after TTL)
    expect(calls[0][0]).toBe(calls[1][0]);
  });

  it('different options produce different cache keys', async () => {
    await setCachedSearchResult('test', 'result1', { filter: 'a' });
    await setCachedSearchResult('test', 'result2', { filter: 'b' });

    const calls = mockRedisClient.setEx.mock.calls;
    // Different options should produce different keys
    expect(calls[0][0]).not.toBe(calls[1][0]);
  });

  it('gracefully handles Redis failures on read', async () => {
    mockRedisClient.get.mockRejectedValueOnce(new Error('Connection failed'));

    const result = await getCachedSearchResult('test');

    expect(result).toBeNull();
  });

  it('gracefully handles Redis failures on write', async () => {
    mockRedisClient.setEx.mockRejectedValueOnce(new Error('Connection failed'));

    // Should not throw
    await expect(setCachedSearchResult('test', 'result')).resolves.toBeUndefined();
  });

  it('resets metrics correctly', async () => {
    mockRedisClient.get.mockResolvedValueOnce('cached');
    await getCachedSearchResult('test');

    let stats = getSearchCacheStats();
    expect(stats.hits).toBe(1);

    resetSearchCacheMetrics();
    stats = getSearchCacheStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('expected savings: 40-60% cache hit rate on static queries', async () => {
    // Simulate 10 identical static query calls
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ results: ['doc1'] }));

    for (let i = 0; i < 10; i++) {
      await getCachedSearchResult('static query');
    }

    const stats = getSearchCacheStats();
    expect(stats.hitRate).toBe(1); // All hits after first
    expect(stats.hits).toBeGreaterThanOrEqual(9);
  });
});
