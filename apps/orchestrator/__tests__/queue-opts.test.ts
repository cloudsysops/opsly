import { describe, expect, it } from 'vitest';
import {
  buildQueueAddOptions,
  PLAN_QUEUE_PRIORITY,
  planToQueuePriority,
  sanitizeQueueJobId,
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
});
