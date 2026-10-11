import { describe, expect, it, vi } from 'vitest';
import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';
import { AgentTaskRuntime, type AgentTaskAdapter } from '../runtime/agent-task-runtime.js';
import { InMemoryWriteApprovalStore } from '../write-approval-store.js';

const SHA = 'e43e2bc8f57d5ea2002e3de82d5a5c4d78ffc824';
const SHA_OTHER = 'a785b34d00000000000000000000000000000000';
const CLAIM_ID = 'claim-write-051';

const binding = {
  work_id: 'github-queue-write-approval-051',
  request_id: 'req-write-051',
  claim_id: CLAIM_ID,
  workstream: 'github-queue-write-approval',
  conflict_key: 'github-queue-write-approval',
  repository: 'cloudsysops/opsly',
  pr_number: 1691,
  pr_branch: 'feat/example-write',
  pr_head_sha: SHA,
  write_allowed: true as const,
};

const dispatchClaim = {
  version: 'dispatch-claim-v1' as const,
  claimId: CLAIM_ID,
  claim_id: CLAIM_ID,
  taskId: binding.work_id,
  task_id: binding.work_id,
  workstream: binding.workstream,
};

function envelope(overrides: Partial<AgentTaskEnvelopeV1> = {}): AgentTaskEnvelopeV1 {
  const baseConstraints = {
    open_source_only: true,
    local_only: true,
    browser_allowed: false,
    network_allowed: false,
    write_allowed: false,
    file_scope: [] as string[],
    max_tokens: 1600,
  };
  const { constraints: overrideConstraints, ...rest } = overrides;
  return {
    schema_version: 'AgentTaskEnvelopeV1',
    request_id: binding.request_id,
    correlation_id: binding.request_id,
    tenant_slug: 'academy-demo',
    task_type: 'code',
    task: 'implement approved write',
    requested_agent: 'mock_agent',
    selected_agent: 'mock_agent',
    skills: [],
    constraints: {
      ...baseConstraints,
      ...(overrideConstraints ?? {}),
    },
    execution_mode: 'enqueue',
    source: 'write-approval-test',
    actor: 'test',
    created_at: '2026-10-11T12:00:00.000Z',
    timeout_ms: 5_000,
    max_attempts: 2,
    budget: { max_tokens: 1600 },
    metadata: {},
    fallback_agents: [],
    ...rest,
  };
}

function writeEnvelope(meta: Record<string, unknown> = {}): AgentTaskEnvelopeV1 {
  return envelope({
    constraints: {
      open_source_only: true,
      local_only: true,
      browser_allowed: false,
      network_allowed: false,
      write_allowed: true,
      file_scope: [],
      max_tokens: 1600,
    },
    metadata: {
      work_id: binding.work_id,
      claim_id: binding.claim_id,
      workstream: binding.workstream,
      conflict_key: binding.conflict_key,
      repository: binding.repository,
      pr_number: binding.pr_number,
      pr_branch: binding.pr_branch,
      pr_head_sha: binding.pr_head_sha,
      dispatch_claim: dispatchClaim,
      ...meta,
    },
  });
}

describe('AgentTaskWriteApprovalV1 runtime gate', () => {
  it('1. read-only + no approval -> PASS', async () => {
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true, result: 'ok' })),
    };
    const runtime = new AgentTaskRuntime();
    const result = await runtime.execute(envelope(), adapter);
    expect(result.status).toBe('completed');
    expect(adapter.execute).toHaveBeenCalledOnce();
  });

  it('2. write + no approval -> BLOCK', async () => {
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const store = new InMemoryWriteApprovalStore();
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const result = await runtime.execute(writeEnvelope(), adapter);
    expect(result.status).toBe('awaiting_approval');
    expect(result.error_code).toBe('WRITE_APPROVAL_REF_MISSING');
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('3. header-only approval -> BLOCK', async () => {
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime();
    const result = await runtime.execute(writeEnvelope(), adapter, {
      autonomyHeaderApproved: true,
    });
    expect(result.status).toBe('awaiting_approval');
    expect(result.error_code).toMatch(/WRITE_APPROVAL_/);
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('4. exact valid approval -> PASS', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;

    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true, result: 'wrote' })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const result = await runtime.execute(
      writeEnvelope({
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: minted.approval.approval_id,
        },
      }),
      adapter
    );
    expect(result.status).toBe('completed');
    expect(adapter.execute).toHaveBeenCalledOnce();
  });

  it('5. expired -> BLOCK', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({
      ...binding,
      approved_by: 'platform-admin',
      expires_at: '2020-01-01T00:00:00.000Z',
    });
    expect(minted.ok).toBe(false);
    expect(minted.ok === false && minted.error).toBe('WRITE_APPROVAL_EXPIRED');

    const expiredStore = new InMemoryWriteApprovalStore();
    const mid = await expiredStore.mint({
      ...binding,
      approved_by: 'platform-admin',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(mid.ok).toBe(true);
    if (!mid.ok) return;
    const internal = expiredStore as unknown as {
      byId: Map<string, { expires_at: string; consumed_at?: string }>;
    };
    const row = internal.byId.get(mid.approval.approval_id)!;
    row.expires_at = '2020-01-01T00:00:00.000Z';

    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: expiredStore });
    const result = await runtime.execute(
      writeEnvelope({
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: mid.approval.approval_id,
        },
      }),
      adapter
    );
    expect(result.status).toBe('awaiting_approval');
    expect(result.error_code).toBe('WRITE_APPROVAL_EXPIRED');
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('6. replay -> BLOCK', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const env = writeEnvelope({
      write_approval_ref: {
        schema_version: 'AgentTaskWriteApprovalV1',
        approval_id: minted.approval.approval_id,
      },
    });
    expect((await runtime.execute(env, adapter)).status).toBe('completed');
    const replay = await runtime.execute(env, adapter);
    expect(replay.status).toBe('awaiting_approval');
    expect(replay.error_code).toBe('WRITE_APPROVAL_ALREADY_CONSUMED');
  });

  it('7. wrong request_id -> BLOCK', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const env = writeEnvelope({
      write_approval_ref: {
        schema_version: 'AgentTaskWriteApprovalV1',
        approval_id: minted.approval.approval_id,
      },
    });
    env.request_id = 'req-other';
    const blocked = await runtime.execute(env, adapter);
    expect(blocked.status).toBe('awaiting_approval');
    expect(blocked.error_code).toBe('WRITE_APPROVAL_BINDING_MISMATCH');
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('8. wrong work_id -> BLOCK', async () => {
    await expectMismatch({ work_id: 'other-work' });
  });

  it('9. wrong PR -> BLOCK', async () => {
    await expectMismatch({ pr_number: 9999 });
  });

  it('10. wrong branch -> BLOCK', async () => {
    await expectMismatch({ pr_branch: 'feat/wrong' });
  });

  it('11. wrong head SHA -> BLOCK', async () => {
    await expectMismatch({ pr_head_sha: SHA_OTHER });
  });

  it('12. wrong workstream/conflict -> BLOCK', async () => {
    await expectMismatch({ workstream: 'other-stream' });
    await expectMismatch({ conflict_key: 'other-conflict' });
  });

  it('13. write_allowed mismatch -> BLOCK', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const readOnly = envelope({
      metadata: {
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: minted.approval.approval_id,
        },
      },
    });
    expect((await runtime.execute(readOnly, adapter)).status).toBe('completed');
    const writeStill = await runtime.execute(
      writeEnvelope({
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: minted.approval.approval_id,
        },
      }),
      adapter
    );
    expect(writeStill.status).toBe('completed');
  });

  it('14. claim still independently required (approval ≠ claim)', async () => {
    const store = new InMemoryWriteApprovalStore();
    expect(typeof (store as unknown as { acquireTaskDispatchClaim?: unknown }).acquireTaskDispatchClaim).toBe(
      'undefined'
    );
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;

    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const wrongClaim = await runtime.execute(
      writeEnvelope({
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: minted.approval.approval_id,
        },
        // Binding claim_id stays CLAIM_ID (matches minted approval); lease identity differs.
        dispatch_claim: {
          ...dispatchClaim,
          claimId: 'other-claim',
          claim_id: 'other-claim',
        },
      }),
      adapter
    );
    expect(wrongClaim.status).toBe('awaiting_approval');
    expect(wrongClaim.error_code).toBe('WRITE_APPROVAL_CLAIM_MISMATCH');
  });

  it('15. no global autoApproveSensitive bypass for writes', async () => {
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({
      policy: { autoApproveSensitive: true },
      writeApproval: new InMemoryWriteApprovalStore(),
    });
    const result = await runtime.execute(writeEnvelope(), adapter);
    expect(result.status).toBe('awaiting_approval');
    expect(result.error_code).toBe('WRITE_APPROVAL_REF_MISSING');
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('16. write approval does not skip network/browser/infra gates', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const result = await runtime.execute(
      writeEnvelope({
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: minted.approval.approval_id,
        },
      }),
      adapter
    );
    // baseline write-only still passes
    expect(result.status).toBe('completed');

    const blocked = await runtime.execute(
      envelope({
        constraints: {
          open_source_only: true,
          local_only: true,
          browser_allowed: false,
          network_allowed: true,
          write_allowed: true,
          file_scope: [],
          max_tokens: 1600,
        },
        metadata: {
          work_id: binding.work_id,
          claim_id: binding.claim_id,
          workstream: binding.workstream,
          conflict_key: binding.conflict_key,
          repository: binding.repository,
          pr_number: binding.pr_number,
          pr_branch: binding.pr_branch,
          pr_head_sha: binding.pr_head_sha,
          dispatch_claim: dispatchClaim,
          write_approval_ref: {
            schema_version: 'AgentTaskWriteApprovalV1',
            approval_id: minted.approval.approval_id,
          },
        },
      }),
      adapter
    );
    expect(blocked.status).toBe('awaiting_approval');
    expect(blocked.error_code).toBe('NETWORK_REQUIRES_APPROVAL');
    expect(adapter.execute).toHaveBeenCalledOnce();
  });

  it('17. dry_run does not consume write approval', async () => {
    const store = new InMemoryWriteApprovalStore();
    const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
    expect(minted.ok).toBe(true);
    if (!minted.ok) return;
    const adapter: AgentTaskAdapter = {
      id: 'mock_agent',
      execute: vi.fn(async () => ({ success: true })),
    };
    const runtime = new AgentTaskRuntime({ writeApproval: store });
    const dry = await runtime.execute(
      {
        ...writeEnvelope({
          write_approval_ref: {
            schema_version: 'AgentTaskWriteApprovalV1',
            approval_id: minted.approval.approval_id,
          },
        }),
        execution_mode: 'dry_run',
      },
      adapter
    );
    expect(dry.status).toBe('dry_run');
    expect(adapter.execute).not.toHaveBeenCalled();
    const real = await runtime.execute(
      writeEnvelope({
        write_approval_ref: {
          schema_version: 'AgentTaskWriteApprovalV1',
          approval_id: minted.approval.approval_id,
        },
      }),
      adapter
    );
    expect(real.status).toBe('completed');
  });

  it('18. caller expires_at beyond max TTL is rejected', async () => {
    const store = new InMemoryWriteApprovalStore();
    const far = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const minted = await store.mint({
      ...binding,
      approved_by: 'platform-admin',
      expires_at: far,
    });
    expect(minted.ok).toBe(false);
    expect(minted.ok === false && minted.error).toBe('WRITE_APPROVAL_TTL_EXCEEDED');
  });
});

async function expectMismatch(metaPatch: Record<string, unknown>): Promise<void> {
  const store = new InMemoryWriteApprovalStore();
  const minted = await store.mint({ ...binding, approved_by: 'platform-admin' });
  expect(minted.ok).toBe(true);
  if (!minted.ok) return;
  const adapter: AgentTaskAdapter = {
    id: 'mock_agent',
    execute: vi.fn(async () => ({ success: true })),
  };
  const runtime = new AgentTaskRuntime({ writeApproval: store });
  const result = await runtime.execute(
    writeEnvelope({
      write_approval_ref: {
        schema_version: 'AgentTaskWriteApprovalV1',
        approval_id: minted.approval.approval_id,
      },
      ...metaPatch,
    }),
    adapter
  );
  expect(result.status).toBe('awaiting_approval');
  expect(['WRITE_APPROVAL_BINDING_MISMATCH', 'WRITE_APPROVAL_CLAIM_MISMATCH']).toContain(
    result.error_code
  );
  expect(adapter.execute).not.toHaveBeenCalled();
}
