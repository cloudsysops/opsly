import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn(),
}));

vi.mock('../src/workers/NotifyWorker.js', () => ({
  notifyDiscord: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_queue, handler, _opts) => ({
    _handler: handler,
  })),
}));

import { execa } from 'execa';
import { notifyDiscord } from '../src/workers/NotifyWorker.js';
import { startBackupWorker } from '../src/workers/BackupWorker.js';
import { Worker } from 'bullmq';

const connection = { host: 'localhost', port: 6379 };

function getHandler() {
  startBackupWorker(connection);
  const workerCtor = Worker as unknown as ReturnType<typeof vi.fn>;
  const lastCall = workerCtor.mock.calls[workerCtor.mock.calls.length - 1];
  return lastCall[1] as (job: { name: string; data: Record<string, unknown> }) => Promise<unknown>;
}

describe('BackupWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores jobs that are not 'backup'", async () => {
    const handler = getHandler();
    const result = await handler({ name: 'cursor', data: {} });
    expect(result).toBeUndefined();
    expect(execa).not.toHaveBeenCalled();
  });

  it('calls backup script for all tenants when no slug provided', async () => {
    (execa as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exitCode: 0 });
    const handler = getHandler();
    const result = await handler({ name: 'backup', data: {} });
    expect(execa).toHaveBeenCalledWith(
      'bash',
      ['./scripts/backup-tenants.sh'],
      expect.objectContaining({ cwd: expect.any(String) })
    );
    expect(result).toEqual({ success: true, tenant_slug: 'all' });
  });

  it('passes --slug when tenant_slug is present in job data', async () => {
    (execa as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ exitCode: 0 });
    const handler = getHandler();
    await handler({ name: 'backup', data: { tenant_slug: 'acme' } });
    expect(execa).toHaveBeenCalledWith(
      'bash',
      ['./scripts/backup-tenants.sh', '--slug', 'acme'],
      expect.anything()
    );
  });

  it('notifies Discord and rethrows on backup failure', async () => {
    const err = new Error('S3 upload failed');
    (execa as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
    const handler = getHandler();
    await expect(handler({ name: 'backup', data: {} })).rejects.toThrow('S3 upload failed');
    expect(notifyDiscord).toHaveBeenCalledWith(
      expect.stringContaining('Backup failed'),
      expect.stringContaining('S3 upload failed'),
      'error'
    );
  });
});
