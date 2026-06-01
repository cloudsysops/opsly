import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execa } from 'execa';
import { countRunningDockerContainers } from '../docker-running-count';
import { getCache, setCache } from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('execa');
vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

describe('countRunningDockerContainers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached value if available', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(5);

    const result = await countRunningDockerContainers();

    expect(result).toBe(5);
    expect(getCache).toHaveBeenCalledWith('docker:running_count');
    expect(execa).not.toHaveBeenCalled();
  });

  it('calls docker ps and caches result if not cached', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(null);
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 0,
      stdout: 'id1\nid2\nid3\n',
    } as any);

    const result = await countRunningDockerContainers();

    expect(result).toBe(3);
    expect(execa).toHaveBeenCalledWith('docker', ['ps', '-q'], { reject: false });
    expect(setCache).toHaveBeenCalledWith('docker:running_count', 3, CACHE_TTL.SHORT);
  });

  it('returns null if docker command fails', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(null);
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 1,
      stderr: 'error',
    } as any);

    const result = await countRunningDockerContainers();

    expect(result).toBeNull();
    expect(setCache).not.toHaveBeenCalled();
  });

  it('handles empty stdout from docker ps', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(null);
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
    } as any);

    const result = await countRunningDockerContainers();

    expect(result).toBe(0);
    expect(setCache).toHaveBeenCalledWith('docker:running_count', 0, CACHE_TTL.SHORT);
  });
});
