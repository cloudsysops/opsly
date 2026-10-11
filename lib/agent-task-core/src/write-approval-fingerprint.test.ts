import { describe, expect, it } from 'vitest';
import {
  writeApprovalBindingFingerprint,
  agentTaskWriteApprovalBindingSchema,
} from './write-approval.js';

const base = {
  work_id: 'work-a',
  request_id: 'req-a',
  claim_id: 'req-a',
  workstream: 'stream-a',
  conflict_key: 'conflict-a',
  repository: 'cloudsysops/opsly',
  pr_number: 1710,
  pr_branch: 'feat/example',
  pr_head_sha: 'e43e2bc8f57d5ea2002e3de82d5a5c4d78ffc824',
  task_content_sha256: 'a'.repeat(64),
  write_allowed: true as const,
};

describe('writeApprovalBindingFingerprint injectivity', () => {
  it('is stable for the same binding', () => {
    const a = writeApprovalBindingFingerprint(base);
    const b = writeApprovalBindingFingerprint({ ...base });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects NUL/newlines in bound text fields (no delimiter smuggling)', () => {
    expect(() =>
      agentTaskWriteApprovalBindingSchema.parse({
        ...base,
        work_id: 'work\u0000a',
      })
    ).toThrow(/NUL|newline/i);
    expect(() =>
      agentTaskWriteApprovalBindingSchema.parse({
        ...base,
        workstream: 'stream\na',
      })
    ).toThrow(/NUL|newline/i);
  });

  it('does not collide when field boundaries would be ambiguous under NUL-join', () => {
    // Under "\0".join these two sets of fields can be made to produce identical
    // concatenations; canonical JSON must keep them distinct.
    const left = writeApprovalBindingFingerprint({
      ...base,
      work_id: 'ab',
      request_id: 'cd',
    });
    const right = writeApprovalBindingFingerprint({
      ...base,
      work_id: 'a',
      request_id: 'bcd',
    });
    expect(left).not.toBe(right);
  });

  it('changes when claim_id differs', () => {
    const left = writeApprovalBindingFingerprint(base);
    const right = writeApprovalBindingFingerprint({
      ...base,
      claim_id: 'req-b',
      request_id: 'req-b',
    });
    expect(left).not.toBe(right);
  });

  it('changes when task_content_sha256 differs', () => {
    const left = writeApprovalBindingFingerprint(base);
    const right = writeApprovalBindingFingerprint({
      ...base,
      task_content_sha256: 'b'.repeat(64),
    });
    expect(left).not.toBe(right);
  });
});
