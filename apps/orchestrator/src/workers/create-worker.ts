import { DelayedError, Job, Worker, type WorkerOptions } from 'bullmq';
import { logWorkerLifecycle, type WorkerName } from '../observability/worker-log.js';
import { getWorkerConcurrency, type WorkerConcurrencyKey } from '../worker-concurrency.js';

export type { WorkerName };

/** Re-queue delay when a named worker briefly holds another job's work. */
const WRONG_WORKER_REQUEUE_MS = 50;

export interface CreateWorkerOpts {
  queueName?: string;
  jobName?: string;
  workerName: WorkerName;
  concurrencyKey?: WorkerConcurrencyKey;
  connection: object;
  processFn: (job: Job) => Promise<unknown>;
  workerOptions?: Omit<WorkerOptions, 'connection' | 'concurrency'>;
}

export function createWorker(opts: CreateWorkerOpts): Worker {
  const {
    queueName = 'openclaw',
    jobName,
    workerName,
    concurrencyKey,
    connection,
    processFn,
    workerOptions,
  } = opts;

  const concurrency = concurrencyKey ? getWorkerConcurrency(concurrencyKey) : 1;

  const worker = new Worker(
    queueName,
    async (job: Job, token?: string) => {
      // Shared `openclaw` queue: many Workers compete for every job. A bare
      // `return` marks the job completed with null (silent no-op). Re-queue so
      // the Worker whose `jobName` matches can process it.
      if (jobName && job.name !== jobName) {
        await job.moveToDelayed(Date.now() + WRONG_WORKER_REQUEUE_MS, token);
        throw new DelayedError();
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', workerName, job);
      try {
        const result = await processFn(job);
        logWorkerLifecycle('complete', workerName, job, {
          duration_ms: Date.now() - t0,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', workerName, job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    {
      connection,
      concurrency,
      ...workerOptions,
    }
  );

  return worker;
}
