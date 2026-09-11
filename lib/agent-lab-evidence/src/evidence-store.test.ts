import { describe, it, expect, beforeEach } from 'vitest';
import { EvidenceStore } from './evidence-store.js';
import type { ExecutionRecord, ReviewRecord } from './types.js';

function makeExecution(overrides: Partial<ExecutionRecord> = {}): ExecutionRecord {
  return {
    execution_id: `EXE-${Math.random()}`,
    request_id: 'req-1',
    agent_id: 'agent-1',
    prompt_version: '1.0.0',
    input_hash: 'hash',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    latency_ms: 1000,
    output: { ok: true },
    tools_used: [],
    resource_usage: { tokens_in: 0, tokens_out: 0, vram_mb: 0 },
    status: 'success',
    ...overrides,
  };
}

function makeReview(execution_id: string, overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    review_id: `REV-${Math.random()}`,
    execution_id,
    reviewer_agent_id: 'codex-cli',
    reviewed_at: new Date().toISOString(),
    decision: 'approved',
    findings: [],
    score: 0.9,
    ...overrides,
  };
}

describe('EvidenceStore', () => {
  let store: EvidenceStore;

  beforeEach(() => {
    store = new EvidenceStore();
    store.registerAgent('agent-1', 'shadow');
  });

  it('registers an agent with a trust profile', () => {
    const agent = store.getAgent('agent-1');
    expect(agent?.trust_level).toBe('shadow');
    expect(agent?.task_count).toBe(0);
  });

  it('records an execution and updates task_count/latency', () => {
    store.recordExecution(makeExecution({ latency_ms: 2000 }));
    const agent = store.getAgent('agent-1');
    expect(agent?.task_count).toBe(1);
    expect(agent?.avg_latency_ms).toBe(2000);
  });

  it('tracks failure_count on failed executions', () => {
    store.recordExecution(makeExecution({ status: 'failure' }));
    const agent = store.getAgent('agent-1');
    expect(agent?.failure_count).toBe(1);
    expect(agent?.last_failure_at).toBeDefined();
  });

  it('updates success_rate and supervisor_agreement from review', () => {
    const execution = makeExecution();
    store.recordExecution(execution);
    store.recordReview(makeReview(execution.execution_id, { decision: 'approved', score: 0.95 }));

    const agent = store.getAgent('agent-1');
    expect(agent?.success_rate).toBe(1);
    expect(agent?.supervisor_agreement).toBe(0.95);
  });

  it('throws when reviewing an execution that does not exist', () => {
    expect(() => store.recordReview(makeReview('missing-exe'))).toThrow('Execution not found');
  });

  it('promotes an agent once thresholds are met', () => {
    store.setPromotionPolicies([
      {
        from_level: 'shadow',
        to_level: 'supervised',
        minimum_tasks: 2,
        min_supervisor_agreement: 0.85,
        max_critical_failures: 0,
        min_success_rate: 0.9,
      },
    ]);

    for (let i = 0; i < 2; i += 1) {
      const execution = makeExecution({ execution_id: `EXE-${i}` });
      store.recordExecution(execution);
      store.recordReview(makeReview(execution.execution_id, { score: 0.9 }));
    }

    expect(store.promoteIfEligible('agent-1')).toBe(true);
    expect(store.getAgent('agent-1')?.trust_level).toBe('supervised');
  });

  it('does not promote when thresholds are not met', () => {
    store.setPromotionPolicies([
      {
        from_level: 'shadow',
        to_level: 'supervised',
        minimum_tasks: 5,
        min_supervisor_agreement: 0.85,
        max_critical_failures: 0,
        min_success_rate: 0.9,
      },
    ]);

    store.recordExecution(makeExecution());
    expect(store.promoteIfEligible('agent-1')).toBe(false);
    expect(store.getAgent('agent-1')?.trust_level).toBe('shadow');
  });

  it('demotes an agent after 3 consecutive failures', () => {
    const agent = store.getAgent('agent-1');
    if (agent) agent.trust_level = 'trusted';

    for (let i = 0; i < 3; i += 1) {
      store.recordExecution(makeExecution({ execution_id: `EXE-fail-${i}`, status: 'failure' }));
    }

    expect(store.demoteIfDegraded('agent-1')).toBe(true);
    expect(store.getAgent('agent-1')?.trust_level).toBe('supervised');
  });

  it('records evidence retrievable by request_id', () => {
    const execution = makeExecution({ request_id: 'req-42' });
    store.recordExecution(execution);
    const review = makeReview(execution.execution_id);
    store.recordReview(review);

    store.recordEvidence({
      evidence_id: 'EV-1',
      request_id: 'req-42',
      execution,
      review,
      final_result: execution.output,
      metrics: {
        worker_agreed_with_supervisor: true,
        worker_agreed_with_human: true,
        supervisor_agreed_with_human: true,
      },
    });

    expect(store.getEvidenceByRequestId('req-42')?.evidence_id).toBe('EV-1');
  });

  it('returns null scorecard for unknown agent', () => {
    expect(store.getAgentScorecard('unknown')).toBeNull();
  });
});
