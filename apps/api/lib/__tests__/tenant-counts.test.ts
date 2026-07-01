import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchActiveTenantCount } from '../tenant-counts';
import * as redisMod from '../redis-cache';
import * as supabaseMod from '../supabase';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

vi.mock('../supabase', () => ({
  getServiceClient: vi.fn(),
}));

describe('fetchActiveTenantCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached value if available', async () => {
    vi.mocked(redisMod.getCache).mockResolvedValue(42);

    const count = await fetchActiveTenantCount();

    expect(count).toBe(42);
    expect(redisMod.getCache).toHaveBeenCalledWith('platform:active_tenants_count');
    expect(supabaseMod.getServiceClient).not.toHaveBeenCalled();
  });

  it('fetches from Supabase and caches result if not in cache', async () => {
    vi.mocked(redisMod.getCache).mockResolvedValue(null);
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSupabase as any);

    const count = await fetchActiveTenantCount();

    expect(count).toBe(10);
    expect(mockSupabase.schema).toHaveBeenCalledWith('platform');
    expect(mockSupabase.from).toHaveBeenCalledWith('tenants');
    expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
    expect(redisMod.setCache).toHaveBeenCalledWith('platform:active_tenants_count', 10, 60);
  });

  it('returns 0 and logs error on Supabase failure', async () => {
    vi.mocked(redisMod.getCache).mockResolvedValue(null);
    const mockSupabase = {
      schema: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: null, error: { message: 'db error' } }),
    };
    vi.mocked(supabaseMod.getServiceClient).mockReturnValue(mockSupabase as any);

    const count = await fetchActiveTenantCount();

    expect(count).toBe(0);
  });
});
