import { describe, expect, it } from 'vitest';

import { mapDockerPsJsonLine } from '../docker-ps-list';

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
