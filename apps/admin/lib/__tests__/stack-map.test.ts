import { describe, expect, it } from 'vitest';
import { stackRecordToContainers } from '../stack-map';

describe('stackRecordToContainers', () => {
  it('maps running containers to ok health', () => {
    const result = stackRecordToContainers({
      app: 'running',
    });
    expect(result).toEqual([{ name: 'app', state: 'running', health: 'ok' }]);
  });

  it('maps stopped containers to — health', () => {
    const result = stackRecordToContainers({
      redis: 'stopped',
    });
    expect(result).toEqual([{ name: 'redis', state: 'stopped', health: '—' }]);
  });

  it('maps multiple containers', () => {
    const result = stackRecordToContainers({
      api: 'running',
      worker: 'running',
      db: 'stopped',
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ name: 'api', state: 'running', health: 'ok' });
    expect(result[2]).toEqual({ name: 'db', state: 'stopped', health: '—' });
  });

  it('returns empty array for empty input', () => {
    expect(stackRecordToContainers({})).toEqual([]);
  });
});
