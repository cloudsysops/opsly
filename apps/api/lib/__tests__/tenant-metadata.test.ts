import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTenantMetadataBySlug } from '../tenant-metadata';
import * as supabase from '../supabase';
import * as redisCache from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

describe('fetchTenantMetadataBySlug', () => {
  const mockSlug = 'test-tenant';
  const mockMetadata = { theme: 'dark' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses cache on subsequent calls', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { metadata: mockMetadata }, error: null });

    const mockDb = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: mockSelect,
      eq: mockEq,
      is: mockIs,
      maybeSingle: mockMaybeSingle,
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      mockDb as unknown as ReturnType<typeof supabase.getServiceClient>
    );

    // First call: cache miss
    vi.mocked(redisCache.getCache).mockResolvedValueOnce(null);

    const res1 = await fetchTenantMetadataBySlug(mockSlug);
    expect(res1).toEqual(mockMetadata);
    expect(redisCache.getCache).toHaveBeenCalledWith(`tenant:metadata:slug:${mockSlug}`);
    expect(supabase.getServiceClient).toHaveBeenCalledTimes(1);
    expect(redisCache.setCache).toHaveBeenCalledWith(
      `tenant:metadata:slug:${mockSlug}`,
      { metadata: mockMetadata },
      CACHE_TTL.SHORT
    );

    // Second call: cache hit
    vi.mocked(redisCache.getCache).mockResolvedValueOnce({ metadata: mockMetadata });

    const res2 = await fetchTenantMetadataBySlug(mockSlug);
    expect(res2).toEqual(mockMetadata);
    expect(supabase.getServiceClient).toHaveBeenCalledTimes(1); // Still 1 from previous call
  });

  it('implements negative caching for null results', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const mockDb = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    };

    vi.mocked(supabase.getServiceClient).mockReturnValue(
      mockDb as unknown as ReturnType<typeof supabase.getServiceClient>
    );
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    const res = await fetchTenantMetadataBySlug('missing-tenant');
    expect(res).toBeNull();
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'tenant:metadata:slug:missing-tenant',
      { metadata: null },
      CACHE_TTL.SHORT
    );
  });
});
