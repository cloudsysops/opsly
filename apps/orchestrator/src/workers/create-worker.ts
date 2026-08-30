import { Job, Worker, type WorkerOptions } from 'bullmq';
import { logWorkerLifecycle, type WorkerName } from '../observability/worker-log.js';
import { getWorkerConcurrency, type WorkerConcurrencyKey } from '../worker-concurrency.js';

export type { WorkerName };

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
    async (job: Job) => {
      if (jobName && job.name !== jobName) {
        // Returning would mark the job completed with no work (stolen by the
        // wrong host, e.g. an ollama-only node on the shared openclaw queue).
        throw new Error(
          `job name ${job.name} is not ${jobName}; retry so another worker can claim it`
        );
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
