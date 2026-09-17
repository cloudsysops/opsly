import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearRuntimeGovernorCache,
  effectiveLimits,
  evaluateEnqueue,
  loadRuntimeGovernorConfig,
  registerActiveLocalJob,
  releaseActiveLocalJob,
} from '../src/lib/runtime-governor.js';

const JOB_IDS = ['capacity-proof-1', 'capacity-proof-2', 'capacity-proof-3'];

beforeEach(() => {
  clearRuntimeGovernorCache();
  for (const id of JOB_IDS) releaseActiveLocalJob(id);
});

afterEach(() => {
  for (const id of JOB_IDS) releaseActiveLocalJob(id);
  clearRuntimeGovernorCache();
});

describe('runtime governor internal capacity boundary', () => {
  it('uses top-level limits when no tenant plan is supplied, while explicit free stays tier-limited', async () => {
    const cfg = await loadRuntimeGovernorConfig();

    expect(effectiveLimits(cfg).max_parallel_jobs).toBe(2);
    expect(effectiveLimits(cfg, 'free').max_parallel_jobs).toBe(1);
  });

  it('admits two internal local jobs and rejects a third without approval', async () => {
    const first = await evaluateEnqueue({
      job_type: 'local_capacity_probe',
      agent_role: 'observer',
    });
    expect(first.allowed).toBe(true);
    registerActiveLocalJob(JOB_IDS[0], 'observer');

    const second = await evaluateEnqueue({
      job_type: 'local_capacity_probe',
      agent_role: 'observer',
    });
    expect(second.allowed).toBe(true);
    registerActiveLocalJob(JOB_IDS[1], 'observer');

    const third = await evaluateEnqueue({
      job_type: 'local_capacity_probe',
      agent_role: 'observer',
    });
    expect(third.allowed).toBe(false);
    expect(third.reason).toContain('MAX_PARALLEL_JOBS=2 reached');
    expect(third.reason).toContain('human approval required');
  });
});
