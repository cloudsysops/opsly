import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExeca = vi.fn();

vi.mock('execa', () => ({
  execa: mockExeca,
}));

import { buildTenantRestartAttempts, tryDockerRestart } from '../workers/HealthWorker.js';

describe('HealthWorker restart attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds restart attempts prioritizing direct container restart for n8n', () => {
    expect(buildTenantRestartAttempts('jkboterolabs', 'n8n')).toEqual([
      ['restart', 'n8n_jkboterolabs'],
      ['compose', '--project-name=tenant_jkboterolabs', 'restart', 'n8n'],
      ['compose', '--project-name=tenant_jkboterolabs', 'restart'],
    ]);
  });

  it('returns true when direct container restart succeeds', async () => {
    mockExeca.mockResolvedValueOnce({ stdout: '' });

    const restarted = await tryDockerRestart('jkboterolabs', 'n8n');

    expect(restarted).toBe(true);
    expect(mockExeca).toHaveBeenCalledTimes(1);
    expect(mockExeca).toHaveBeenCalledWith('docker', ['restart', 'n8n_jkboterolabs']);
  });

  it('falls back to compose restart when direct restart fails', async () => {
    mockExeca
      .mockRejectedValueOnce(new Error('container missing'))
      .mockResolvedValueOnce({ stdout: '' });

    const restarted = await tryDockerRestart('jkboterolabs', 'n8n');

    expect(restarted).toBe(true);
    expect(mockExeca).toHaveBeenNthCalledWith(1, 'docker', ['restart', 'n8n_jkboterolabs']);
    expect(mockExeca).toHaveBeenNthCalledWith(2, 'docker', [
      'compose',
      '--project-name=tenant_jkboterolabs',
      'restart',
      'n8n',
    ]);
  });

  it('returns false when all restart attempts fail', async () => {
    mockExeca
      .mockRejectedValueOnce(new Error('container missing'))
      .mockRejectedValueOnce(new Error('compose service missing'))
      .mockRejectedValueOnce(new Error('compose project missing'));

    const restarted = await tryDockerRestart('jkboterolabs', 'n8n');

    expect(restarted).toBe(false);
    expect(mockExeca).toHaveBeenCalledTimes(3);
  });
});
