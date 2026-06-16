import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOpenClawMissionControlSnapshot } from '../admin-mission-control-openclaw';
import { getCache, setCache } from '../redis-cache';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
  getRedisClient: vi.fn(() => ({
    lRange: vi.fn().mockResolvedValue([]),
    hGetAll: vi.fn().mockResolvedValue({}),
  })),
}));

describe('admin-mission-control-openclaw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached snapshot if available', async () => {
    const mockSnapshot = {
      intents: [],
      intents_in_progress: [],
      recent_policy_violations: [],
      agent_metrics: {},
      generated_at: '2023-01-01T00:00:00Z',
    };
    vi.mocked(getCache).mockResolvedValueOnce(mockSnapshot);

    const result = await getOpenClawMissionControlSnapshot();

    expect(result).toEqual(mockSnapshot);
    expect(getCache).toHaveBeenCalledWith('admin:mission-control:openclaw:snapshot');
    // Should NOT call setCache if cache hit
    expect(setCache).not.toHaveBeenCalled();
  });

  it('fetches and caches snapshot if not in cache', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(null);

    const result = await getOpenClawMissionControlSnapshot();

    expect(result).toBeDefined();
    expect(result.intents).toEqual([]);
    expect(getCache).toHaveBeenCalledWith('admin:mission-control:openclaw:snapshot');
    expect(setCache).toHaveBeenCalledWith(
      'admin:mission-control:openclaw:snapshot',
      expect.any(Object),
      expect.any(Number)
    );
  });
});
