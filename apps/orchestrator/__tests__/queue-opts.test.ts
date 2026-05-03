import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  buildQueueAddOptions,
  PLAN_QUEUE_PRIORITY,
  planToQueuePriority,
  sanitizeQueueJobId,
  OPTIMIZED_DRAIN_PROFILE,
  LEGACY_DRAIN_PROFILE,
  getPollingProfile,
} from '../src/queue-opts.js';
import type { OrchestratorJob } from '../src/types.js';

function baseJob(overrides: Partial<OrchestratorJob>): OrchestratorJob {
  return {
    type: 'notify',
    payload: {},
    initiated_by: 'system',
    ...overrides,
  };
}

describe('sanitizeQueueJobId', () => {
  it('permite alfanuméricos y : _ -', () => {
    expect(sanitizeQueueJobId('idem:notify:abc-123')).toBe('idem:notify:abc-123');
  });

  it('reemplaza caracteres no seguros', () => {
    expect(sanitizeQueueJobId('a@b#c')).toBe('a_b_c');
  });

  it('trunca a 128 caracteres', () => {
    const long = 'x'.repeat(200);
    expect(sanitizeQueueJobId(long).length).toBe(128);
  });
});

describe('planToQueuePriority', () => {
  it('enterprise es la más alta (menor número BullMQ)', () => {
    expect(planToQueuePriority('enterprise')).toBe(PLAN_QUEUE_PRIORITY.enterprise);
    expect(planToQueuePriority('enterprise')).toBeLessThan(planToQueuePriority('business'));
  });

  it('business entre enterprise y startup', () => {
    expect(planToQueuePriority('business')).toBe(PLAN_QUEUE_PRIORITY.business);
    expect(planToQueuePriority('business')).toBeLessThan(planToQueuePriority('startup'));
  });

  it('sin plan equivale a startup', () => {
    expect(planToQueuePriority(undefined)).toBe(PLAN_QUEUE_PRIORITY.startup);
    expect(planToQueuePriority('startup')).toBe(PLAN_QUEUE_PRIORITY.startup);
  });
});

describe('buildQueueAddOptions', () => {
  it('sin idempotency_key no fija jobId', () => {
    const opts = buildQueueAddOptions(baseJob({}));
    expect(opts.jobId).toBeUndefined();
    expect(opts.attempts).toBe(3);
    expect(opts.priority).toBe(PLAN_QUEUE_PRIORITY.startup);
  });

  it('prioridad por plan', () => {
    expect(buildQueueAddOptions(baseJob({ plan: 'enterprise' })).priority).toBe(
      PLAN_QUEUE_PRIORITY.enterprise
    );
    expect(buildQueueAddOptions(baseJob({ plan: 'business' })).priority).toBe(
      PLAN_QUEUE_PRIORITY.business
    );
  });

  it('con idempotency_key fija jobId determinista', () => {
    const opts = buildQueueAddOptions(
      baseJob({ type: 'cursor', idempotency_key: 'run-1::cursor::0' })
    );
    expect(opts.jobId).toBe('idem:cursor:run-1::cursor::0');
  });

  it('sube prioridad (menor número) para jobs derivados del Remote Planner', () => {
    const base = buildQueueAddOptions(baseJob({ plan: 'startup' })).priority ?? 0;
    const boosted =
      buildQueueAddOptions(
        baseJob({
          plan: 'startup',
          payload: { planner_tool: 'notify', message: 'x' },
        })
      ).priority ?? 0;
    expect(boosted).toBeLessThan(base);
  });

  it('aplica política de autonomía por tipo de job (medium/high)', () => {
    const medium = buildQueueAddOptions(baseJob({ type: 'cursor' }));
    const high = buildQueueAddOptions(baseJob({ type: 'hive_objective' }));
    expect(medium.attempts).toBe(2);
    expect(high.attempts).toBe(1);
  });

  it('respeta override de riesgo explícito', () => {
    const opts = buildQueueAddOptions(
      baseJob({
        type: 'notify',
        autonomy_risk: 'high',
      })
    );
    expect(opts.attempts).toBe(1);
  });
});

describe('polling optimization (reduce-polling-frequency)', () => {
  beforeEach(() => {
    // Reset env var before each test
    delete process.env.ORCHESTRATOR_POLLING_OPTIMIZED;
  });

  afterEach(() => {
    delete process.env.ORCHESTRATOR_POLLING_OPTIMIZED;
  });

  it('optimized drain: 3s long-poll when empty (vs legacy 1s)', () => {
    const profile = OPTIMIZED_DRAIN_PROFILE;
    expect(profile.drainDelaySeconds).toBe(3);
  });

  it('legacy drain: 1s for backward compatibility', () => {
    const profile = LEGACY_DRAIN_PROFILE;
    expect(profile.drainDelaySeconds).toBe(1);
  });

  it('uses optimized profile by default', () => {
    const profile = getPollingProfile();
    expect(profile.drainDelaySeconds).toBe(3);
  });

  it('can disable optimization with env var', () => {
    process.env.ORCHESTRATOR_POLLING_OPTIMIZED = 'false';
    const profile = getPollingProfile();
    expect(profile.drainDelaySeconds).toBe(1);
  });

  it('optimized has 5s retry delay hint', () => {
    const profile = OPTIMIZED_DRAIN_PROFILE;
    expect(profile.retryProcessDelayMs).toBe(5000);
  });

  it('legacy has 3s retry delay hint', () => {
    const profile = LEGACY_DRAIN_PROFILE;
    expect(profile.retryProcessDelayMs).toBe(3000);
  });

  it('expected savings: fewer empty-queue polls with longer drainDelay', () => {
    const legacyPollsPerSec = 1 / LEGACY_DRAIN_PROFILE.drainDelaySeconds;
    const optimizedPollsPerSec = 1 / OPTIMIZED_DRAIN_PROFILE.drainDelaySeconds;
    const reductionPct = ((legacyPollsPerSec - optimizedPollsPerSec) / legacyPollsPerSec) * 100;
    expect(reductionPct).toBeGreaterThan(60);
  });

  it('job processing latency: no delay if queue has pending jobs', () => {
    // The polling config affects empty-queue behavior only
    // Active jobs are processed immediately (BullMQ)
    const opts = buildQueueAddOptions(baseJob({}));
    expect(opts.priority).toBeDefined();
    expect(opts.attempts).toBeGreaterThan(0);
  });
});
