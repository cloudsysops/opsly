import { describe, expect, it } from 'vitest';
import {
  assertWriteApprovalMatchesBinding,
  bindingsEqual,
  extractWriteApprovalContext,
  isWriteApprovalExpired,
  parseAgentTaskWriteApproval,
  writeApprovalBindingFingerprint,
} from './write-approval.js';
import { buildAgentTaskEnvelope } from './envelope.js';

const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);

const baseBinding = {
  work_id: 'github-queue-write-approval-051',
  request_id: 'req-051-1',
  workstream: 'github-queue-write-approval',
  conflict_key: 'github-queue-write-approval',
  repository: 'cloudsysops/opsly',
  pr_number: 1691,
  pr_branch: 'feat/example',
  pr_head_sha: SHA,
  write_allowed: true as const,
};

describe('AgentTaskWriteApprovalV1 helpers', () => {
  it('fingerprints bindings stably and rejects inequality', () => {
    const a = writeApprovalBindingFingerprint(baseBinding);
    const b = writeApprovalBindingFingerprint({ ...baseBinding, pr_head_sha: SHA.toUpperCase() });
    expect(a).toBe(b);
    expect(bindingsEqual(baseBinding, { ...baseBinding, request_id: 'other' })).toBe(false);
  });

  it('detects expiry', () => {
    expect(
      isWriteApprovalExpired({ expires_at: '2020-01-01T00:00:00.000Z' }, new Date('2026-01-01T00:00:00.000Z'))
    ).toBe(true);
    expect(
      isWriteApprovalExpired({ expires_at: '2099-01-01T00:00:00.000Z' }, new Date('2026-01-01T00:00:00.000Z'))
    ).toBe(false);
  });

  it('extracts binding from envelope metadata', () => {
    const envelope = buildAgentTaskEnvelope({
      task: 'write something',
      tenantSlug: 'academy-demo',
      selectedAgent: 'local_opencode',
      requestId: 'req-051-1',
      writeAllowed: true,
      metadata: {
        work_id: baseBinding.work_id,
        workstream: baseBinding.workstream,
        conflict_key: baseBinding.conflict_key,
        repository: baseBinding.repository,
        pr_number: baseBinding.pr_number,
        pr_branch: baseBinding.pr_branch,
        pr_head_sha: baseBinding.pr_head_sha,
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: 'apr-1',
        },
      },
    });
    const ctx = extractWriteApprovalContext(envelope);
    expect(ctx.writeAllowed).toBe(true);
    expect(ctx.ref?.approval_id).toBe('apr-1');
    expect(ctx.binding?.pr_head_sha).toBe(SHA);
  });

  it('assertWriteApprovalMatchesBinding catches wrong SHA and consumed', () => {
    const approval = parseAgentTaskWriteApproval({
      schema_version: 'AgentTaskWriteApprovalV1',
      approval_id: 'apr-1',
      ...baseBinding,
      approved_by: 'platform',
      approved_at: '2026-10-11T00:00:00.000Z',
      expires_at: '2099-01-01T00:00:00.000Z',
    });
    expect(assertWriteApprovalMatchesBinding(approval, baseBinding)).toBeNull();
    expect(
      assertWriteApprovalMatchesBinding(approval, { ...baseBinding, pr_head_sha: SHA2 })
    ).toBe('WRITE_APPROVAL_BINDING_MISMATCH');
    expect(
      assertWriteApprovalMatchesBinding(
        { ...approval, consumed_at: '2026-10-11T01:00:00.000Z' },
        baseBinding
      )
    ).toBe('WRITE_APPROVAL_ALREADY_CONSUMED');
  });
});
