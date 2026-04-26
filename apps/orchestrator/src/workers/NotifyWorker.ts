import { Job, Worker } from 'bullmq';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

const WEBHOOK = process.env.DISCORD_WEBHOOK_URL || '';

export async function notifyDiscord(
  title: string,
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info'
): Promise<void> {
  if (!WEBHOOK) {
    return;
  }

  const colors = {
    success: 3066993,
    error: 15158332,
    warning: 16776960,
    info: 3447003,
  } as const;

  await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title,
          description: message,
          color: colors[type],
          timestamp: new Date().toISOString(),
          footer: { text: 'Opsly Platform · OpenClaw' },
        },
      ],
    }),
  }).catch(() => {
    // no-op: la notificacion no debe romper el job
  });
}

export function startNotifyWorker(connection: object) {
  const concurrency = getWorkerConcurrency('notify');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'notify') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'notify', job);
      try {
        const payload = job.data.payload as {
          title?: string;
          message?: string;
          type?: 'success' | 'error' | 'info' | 'warning';
        };
        await notifyDiscord(
          payload.title || 'OpenClaw notificacion',
          payload.message || 'Sin mensaje',
          payload.type || 'info'
        );
        logWorkerLifecycle('complete', 'notify', job, { duration_ms: Date.now() - t0 });
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'notify', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency }
  );
}
