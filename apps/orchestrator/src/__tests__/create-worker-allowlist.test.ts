import { describe, expect, it, vi } from 'vitest';

vi.mock('bullmq', () => {
  class DelayedError extends Error {
    constructor() {
      super('DelayedError');
      this.name = 'DelayedError';
    }
  }
  class Worker {
    processor: (job: { name: string; moveToDelayed: ReturnType<typeof vi.fn> }, token?: string) => Promise<unknown>;
    opts: unknown;
    constructor(
      _queue: string,
      processor: Worker['processor'],
      opts: unknown
    ) {
      this.processor = processor;
      this.opts = opts;
    }
    async close(): Promise<void> {
      return;
    }
  }
  return { Worker, DelayedError, Job: class {} };
});

vi.mock('../observability/worker-log.js', () => ({
  logWorkerLifecycle: vi.fn(),
}));

vi.mock('../worker-concurrency.js', () => ({
  getWorkerConcurrency: () => 1,
}));

import { DelayedError } from 'bullmq';
import { createWorker } from '../workers/create-worker.js';

type TestableWorker = {
  processor: (
    job: { name: string; moveToDelayed: ReturnType<typeof vi.fn> },
    token?: string
  ) => Promise<unknown>;
};

describe('createWorker jobName guard', () => {
  it('re-queues (DelayedError) when job name does not match', async () => {
    const processFn = vi.fn(async () => ({ ok: true }));
    const worker = createWorker({
      jobName: 'ollama',
      workerName: 'ollama',
      connection: {},
      processFn,
    }) as unknown as TestableWorker;

    const moveToDelayed = vi.fn(async () => undefined);
    const job = { name: 'notify', moveToDelayed };

    await expect(worker.processor(job, 'token-1')).rejects.toBeInstanceOf(DelayedError);
    expect(moveToDelayed).toHaveBeenCalledOnce();
    expect(processFn).not.toHaveBeenCalled();
  });

  it('runs processFn when job name matches', async () => {
    const processFn = vi.fn(async () => ({ ok: true }));
    const worker = createWorker({
      jobName: 'ollama',
      workerName: 'ollama',
      connection: {},
      processFn,
    }) as unknown as TestableWorker;

    const moveToDelayed = vi.fn(async () => undefined);
    const job = { name: 'ollama', moveToDelayed };

    await expect(worker.processor(job, 'token-1')).resolves.toEqual({ ok: true });
    expect(moveToDelayed).not.toHaveBeenCalled();
    expect(processFn).toHaveBeenCalledOnce();
  });
});
