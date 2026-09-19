import { describe, expect, it } from 'vitest';
import { assertWorkClosureV1, checkWorkClosureV1, type WorkHandoffV1 } from './index.js';

function handoff(overrides: Partial<WorkHandoffV1> = {}): WorkHandoffV1 {
  return {
    schema_version: 'work-handoff-v1',
    handoff_id: 'handoff:req-1:1',
    request_id: 'req-1',
    work_id: 'work-1',
    agent_id: 'local_hermes',
    runtime: 'hermes',
    attempt: 1,
    objective: 'Fix the bounded failing check',
    terminal_state: 'ready_to_merge',
    evidence_ids: ['evidence:req-1:1'],
    issue_or_pr: '#1589',
    branch: 'docs/factory-operational-roadmap',
    head_sha: 'abc123',
    touched_surfaces: ['lib/agent-learning'],
    decisions: ['reuse canonical agent-learning evidence'],
    validations: ['npm test -w @intcloudsysops/agent-learning'],
    blockers: [],
    next_step: 'wait for governed merge gates',
    durable_knowledge_changed: true,
    documentation_refs: ['docs/03-agents/AGENT-BRAIN-CONTRACT.md'],
    recorded_at: '2026-09-15T15:57:00.000Z',
    ...overrides,
  };
}

describe('WorkHandoffV1 closure guard', () => {
  it('accepts evidence-backed, validated, documented successful closure', () => {
    expect(checkWorkClosureV1(handoff())).toMatchObject({ allowed: true, blockers: [] });
  });

  it('fails closed when execution evidence is missing', () => {
    expect(checkWorkClosureV1(handoff({ evidence_ids: [] })).blockers).toContain(
      'missing_execution_evidence'
    );
  });

  it('requires validation evidence before READY_TO_MERGE', () => {
    expect(checkWorkClosureV1(handoff({ validations: [] })).blockers).toContain(
      'missing_validation_evidence'
    );
  });

  it('requires documentation writeback when durable knowledge changed', () => {
    expect(checkWorkClosureV1(handoff({ documentation_refs: [] })).blockers).toContain(
      'missing_documentation_writeback'
    );
  });

  it('preserves failed attempts but requires a blocker for retry', () => {
    const result = checkWorkClosureV1(
      handoff({
        terminal_state: 'retryable',
        validations: [],
        durable_knowledge_changed: false,
        documentation_refs: [],
        blockers: ['worker lease expired'],
      })
    );
    expect(result.allowed).toBe(true);
  });

  it('rejects a retry that explains no blocker', () => {
    expect(
      checkWorkClosureV1(
        handoff({
          terminal_state: 'retryable',
          validations: [],
          durable_knowledge_changed: false,
          documentation_refs: [],
          blockers: [],
        })
      ).blockers
    ).toContain('retry_without_blocker');
  });

  it('redacts obvious secrets in handoff text', () => {
    const result = assertWorkClosureV1(
      handoff({ decisions: ['token=super-secret-value'] })
    );
    expect(result.decisions[0]).toBe('token=[REDACTED]');
  });
});
