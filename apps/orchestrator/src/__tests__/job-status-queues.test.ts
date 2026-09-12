import { describe, expect, it, vi } from 'vitest';
import { findJobAcrossQueues } from '../http/job-lookup.js';

describe('findJobAcrossQueues', () => {
  it('returns openclaw job when present on first queue', async () => {
    const openclawJob = { id: 'oc-1', name: 'cursor' };
    const queues = [
      { name: 'openclaw', getJob: vi.fn(async () => openclawJob as never) },
      { name: 'local-agents', getJob: vi.fn(async () => undefined) },
    ];
    const found = await findJobAcrossQueues('oc-1', queues);
    expect(found?.queue).toBe('openclaw');
    expect(found?.job).toBe(openclawJob);
    expect(queues[1]!.getJob).not.toHaveBeenCalled();
  });

  it('falls back to local-agents when openclaw miss', async () => {
    const localJob = { id: 'agent-loop-e2e-smoke-025', name: 'local_cursor' };
    const queues = [
      { name: 'openclaw', getJob: vi.fn(async () => undefined) },
      { name: 'local-agents', getJob: vi.fn(async () => localJob as never) },
    ];
    const found = await findJobAcrossQueues('agent-loop-e2e-smoke-025', queues);
    expect(found?.queue).toBe('local-agents');
    expect(found?.job).toBe(localJob);
  });

  it('returns null when neither queue has the job', async () => {
    const queues = [
      { name: 'openclaw', getJob: vi.fn(async () => undefined) },
      { name: 'local-agents', getJob: vi.fn(async () => undefined) },
    ];
    await expect(findJobAcrossQueues('missing', queues)).resolves.toBeNull();
  });
});
