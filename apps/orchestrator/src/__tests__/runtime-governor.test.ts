import { describe, expect, it, beforeEach } from 'vitest';
import { join } from 'node:path';

import {
  clearRuntimeGovernorCache,
  evaluateEnqueue,
  registerActiveLocalJob,
  releaseActiveLocalJob,
  loadRuntimeGovernorConfig,
} from '../lib/runtime-governor.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');

describe('runtime-governor', () => {
  beforeEach(() => {
    clearRuntimeGovernorCache();
    process.env.OPSLY_ROOT = REPO_ROOT;
  });

  it('loads config from repo', async () => {
    const cfg = await loadRuntimeGovernorConfig();
    expect(cfg.max_parallel_jobs).toBe(1);
    expect(cfg.max_active_implementation_workers).toBe(1);
  });

  it('blocks second local job when MAX_PARALLEL_JOBS reached', async () => {
    registerActiveLocalJob('job-1', 'executor');
    const decision = await evaluateEnqueue({
      job_type: 'local_opencode',
      agent_role: 'executor',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('MAX_PARALLEL_JOBS');
  });

  it('allows job after release', async () => {
    registerActiveLocalJob('job-1', 'executor');
    releaseActiveLocalJob('job-1');
    const decision = await evaluateEnqueue({
      job_type: 'local_opencode',
      agent_role: 'executor',
    });
    expect(decision.allowed).toBe(true);
  });
});
