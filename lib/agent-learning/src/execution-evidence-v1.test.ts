import { describe, expect, it } from 'vitest';
import { AgentLearningStore } from './store.js';
import type { ExecutionEvidenceV1 } from './execution-evidence-v1.js';

function base(overrides: Partial<ExecutionEvidenceV1> = {}): ExecutionEvidenceV1 {
  return {
    schema_version: 'execution-evidence-v1',
    evidence_id: 'ev-req-1',
    request_id: 'req-1',
    task_id: 'req-1',
    tenant_slug: 'opsly',
    workstream: 'intelligence.execution-evidence',
    selected_runtime: 'local_opencode',
    selected_model: 'qwen3:8b',
    node_id: 'pc-gamer',
    queued_at: '2026-09-13T15:00:00.000Z',
    claimed_at: '2026-09-13T15:00:01.000Z',
    started_at: '2026-09-13T15:00:02.000Z',
    completed_at: '2026-09-13T15:00:03.000Z',
    ephemeral_session_id: 'opsly-task-req-1',
    result: { summary: 'GAMER_OPENCODE_OK', metadata: { tests: 12 } },
    retry_count: 0,
    teardown_state: 'confirmed',
    cost_class: 'zero',
    status: 'success',
    ...overrides,
  };
}

describe('ExecutionEvidenceV1', () => {
  it('records successful governed execution evidence', () => {
    const store = new AgentLearningStore();
    const evidence = store.attachExecutionEvidenceV1(base());
    expect(evidence.request_id).toBe('req-1');
    expect(evidence.selected_runtime).toBe('local_opencode');
    expect(evidence.teardown_state).toBe('confirmed');
    expect(store.listExecutionEvidenceV1('req-1')).toHaveLength(1);
  });

  it('records runtime failure and retry evidence', () => {
    const store = new AgentLearningStore();
    const evidence = store.attachExecutionEvidenceV1(
      base({
        evidence_id: 'ev-retry',
        retry_count: 1,
        status: 'failure',
        failure_category: 'runtime',
        result: { summary: 'runtime exited non-zero' },
      })
    );
    expect(evidence.retry_count).toBe(1);
    expect(evidence.failure_category).toBe('runtime');
  });

  it('records teardown failure explicitly', () => {
    const store = new AgentLearningStore();
    const evidence = store.attachExecutionEvidenceV1(
      base({
        evidence_id: 'ev-teardown',
        status: 'failure',
        failure_category: 'teardown',
        teardown_state: 'failed',
        result: { summary: 'session remained after task completion' },
      })
    );
    expect(evidence.teardown_state).toBe('failed');
    expect(evidence.failure_category).toBe('teardown');
  });

  it('redacts and bounds secret-bearing result text', () => {
    const store = new AgentLearningStore();
    const evidence = store.attachExecutionEvidenceV1(
      base({
        evidence_id: 'ev-redaction',
        result: {
          summary: 'Bearer abc.def.ghi token=super-secret password=hunter2',
          metadata: {
            auth: 'api_key=abc123',
            safe: 'ok',
          },
        },
      })
    );
    expect(evidence.result.summary).not.toContain('super-secret');
    expect(evidence.result.summary).not.toContain('hunter2');
    expect(evidence.result.summary).toContain('[REDACTED]');
    expect(evidence.result.metadata?.auth).toContain('[REDACTED]');
    expect(evidence.result.metadata?.safe).toBe('ok');
  });

  it('is idempotent for identical evidence and rejects conflicting duplicates', () => {
    const store = new AgentLearningStore();
    const first = store.attachExecutionEvidenceV1(base());
    const second = store.attachExecutionEvidenceV1(base());
    expect(second).toEqual(first);
    expect(store.listExecutionEvidenceV1()).toHaveLength(1);

    expect(() =>
      store.attachExecutionEvidenceV1(
        base({ result: { summary: 'different terminal result' } })
      )
    ).toThrow(/conflicting duplicate/i);
  });

  it('refuses an independent task identity', () => {
    const store = new AgentLearningStore();
    expect(() =>
      store.attachExecutionEvidenceV1(base({ task_id: 'other-task' }))
    ).toThrow(/task_id must equal/i);
  });
});
