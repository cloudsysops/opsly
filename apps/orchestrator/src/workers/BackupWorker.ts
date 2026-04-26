import { Job, Worker } from 'bullmq';
import { execa } from 'execa';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { notifyDiscord } from './NotifyWorker.js';

const BACKUP_SCRIPT = './scripts/backup-tenants.sh';

export function startBackupWorker(connection: object) {
  const concurrency = getWorkerConcurrency('backup');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'backup') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'backup', job);

      const slug: string | undefined =
        typeof job.data?.tenant_slug === 'string' ? job.data.tenant_slug : undefined;

      try {
        const args: string[] = [];
        if (slug) {
          args.push('--slug', slug);
        }

        await execa('bash', [BACKUP_SCRIPT, ...args], {
          cwd: process.cwd(),
          env: { ...process.env },
        });

        logWorkerLifecycle('complete', 'backup', job, {
          duration_ms: Date.now() - t0,
        });
        return { success: true, tenant_slug: slug ?? 'all' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'backup', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        await notifyDiscord(
          '🔴 Backup failed',
          `Tenant: **${slug ?? 'all'}**\n\`\`\`${msg.slice(0, 800)}\`\`\``,
          'error'
        );
        throw err;
      }
    },
    { connection, concurrency }
  );
}
