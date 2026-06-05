import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as redisCache from '../redis-cache';
import { listDockerContainers, mapDockerPsJsonLine } from '../docker-ps-list';
import { execa } from 'execa';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

vi.mock('execa', () => ({
  execa: vi.fn(),
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

describe('listDockerContainers with caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached data if available', async () => {
    const cachedResult = { ok: true, containers: [{ id: 'cached' }], truncated: false };
    vi.mocked(redisCache.getCache).mockResolvedValue(cachedResult);

    const result = await listDockerContainers();

    expect(result).toEqual(cachedResult);
    expect(execa).not.toHaveBeenCalled();
  });

  it('calls docker ps and caches result if not in cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(execa).mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({ ID: 'new', Names: 'new-container', Image: 'img', State: 'running' }),
      stderr: '',
    } as unknown);

    const result = await listDockerContainers();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.containers[0].id).toBe('new');
    }
    expect(execa).toHaveBeenCalledWith(
      'docker',
      expect.arrayContaining(['ps', '-a']),
      expect.objectContaining({
        timeout: 2000,
      })
    );
    expect(redisCache.setCache).toHaveBeenCalledWith(
      'docker:ps_list',
      expect.anything(),
      expect.anything()
    );
  });

  it('handles docker failure', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(execa).mockResolvedValue({
      exitCode: 1,
      stderr: 'docker daemon down',
    } as unknown);

    const result = await listDockerContainers();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('docker daemon down');
    }
  });
});
