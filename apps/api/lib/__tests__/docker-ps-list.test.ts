import { describe, expect, it, vi, beforeEach } from 'vitest';
import { execa } from 'execa';

import { listDockerContainers, mapDockerPsJsonLine } from '../docker-ps-list';
import { getCache, setCache } from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('execa');
vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

describe('mapDockerPsJsonLine', () => {
  it('parses a typical docker ps json line (capital keys)', () => {
    const line = JSON.stringify({
      ID: 'abc123',
      Names: 'infra-app-1',
      Image: 'ghcr.io/org/api:latest',
      Command: 'node server.js',
      CreatedAt: '2026-01-01 12:00:00 +0000 UTC',
      RunningFor: '2 hours ago',
      Ports: '3000/tcp',
      State: 'running',
      Status: 'Up 2 hours',
    });
    const row = mapDockerPsJsonLine(line);
    expect(row).not.toBeNull();
    expect(row?.id).toBe('abc123');
    expect(row?.names).toEqual(['infra-app-1']);
    expect(row?.image).toContain('api');
    expect(row?.state).toBe('running');
  });

  it('parses Names as array', () => {
    const line = JSON.stringify({
      ID: 'x1',
      Names: ['a', 'b'],
      Image: 'nginx',
      State: 'exited',
      Status: 'Exited (0) 1 day ago',
    });
    const row = mapDockerPsJsonLine(line);
    expect(row?.names).toEqual(['a', 'b']);
  });

  it('returns null for invalid json', () => {
    expect(mapDockerPsJsonLine('not json')).toBeNull();
    expect(mapDockerPsJsonLine('')).toBeNull();
  });
});

describe('listDockerContainers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached value if available', async () => {
    const mockResult = {
      ok: true,
      containers: [{ id: '1', names: ['c1'] }],
      truncated: false,
    };
    vi.mocked(getCache).mockResolvedValueOnce(mockResult);

    const result = await listDockerContainers();

    expect(result).toEqual(mockResult);
    expect(getCache).toHaveBeenCalledWith('docker:ps_list');
    expect(execa).not.toHaveBeenCalled();
  });

  it('calls docker ps and caches result if not cached', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(null);
    const mockContainer = {
      ID: 'c1',
      Names: 'container-1',
      Image: 'nginx',
      State: 'running',
    };
    vi.mocked(execa).mockResolvedValueOnce({
      exitCode: 0,
      stdout: JSON.stringify(mockContainer) + '\n',
    } as any);

    const result = await listDockerContainers();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.containers).toHaveLength(1);
      expect(result.containers[0].id).toBe('c1');
    }
    expect(setCache).toHaveBeenCalledWith('docker:ps_list', expect.any(Object), CACHE_TTL.SHORT);
  });
});
