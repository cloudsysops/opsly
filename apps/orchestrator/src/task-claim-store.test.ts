import { beforeEach, describe, expect, it, vi } from 'vitest';

const redis = vi.hoisted(() => ({
  eval: vi.fn(),
}));

vi.mock('./queue.js', () => ({
  localAgentQueue: {
    client: Promise.resolve(redis),
  },
}));

import {
  acquireTaskDispatchClaim,
  completeTaskDispatchClaim,
  dispatchClaimRequestFromContext,
  parseDispatchClaimLease,
  releaseTaskDispatchClaim,
} from './task-claim-store.js';

describe('task dispatch claim store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires governed GitHub workpacks to declare ownership metadata', () => {
    expect(() =>
      dispatchClaimRequestFromContext({
        tenantSlug: 'local',
        requestId: 'req-1',
        context: {
          source: 'github-agent-queue',
          workpack_id: 'wp-1',
          workstream: 'orchestrator',
        },
      })
    ).toThrow(/conflict_key is required/);
  });

  it('does not impose ownership claims on unrelated legacy/manual requests', () => {
    expect(
      dispatchClaimRequestFromContext({
        tenantSlug: 'local',
        requestId: 'req-1',
        context: {},
      })
    ).toBeNull();
  });

  it('atomically claims all dimensions with one Redis eval', async () => {
    redis.eval.mockResolvedValueOnce([1, 4, '']);
    const result = await acquireTaskDispatchClaim({
      tenantSlug: 'local',
      requestId: 'claim-1',
      taskId: 'wp-1',
      workstream: 'orchestrator',
      conflictKey: 'orchestrator/local-dispatch',
      semanticScope: 'prevent duplicate work',
      affectedPaths: ['apps/orchestrator/src/http/routes/local.ts'],
      owner: 'sierra',
    });

    expect(result.acquired).toBe(true);
    expect(redis.eval).toHaveBeenCalledTimes(1);
    const args = redis.eval.mock.calls[0]!;
    expect(args[1]).toBe(4);
    expect(args.join(' ')).toContain('claim-1|');
    if (result.acquired) {
      expect(result.lease.descriptors).toHaveLength(4);
      expect(result.lease.claimId).toBe('claim-1');
    }
  });

  it('scopes shared repository ownership dimensions across tenants', async () => {
    redis.eval.mockResolvedValue([1, 4, '']);

    await acquireTaskDispatchClaim({
      tenantSlug: 'tenant-a',
      requestId: 'claim-a',
      taskId: 'wp-a',
      workstream: 'orchestrator',
      conflictKey: 'orchestrator/shared-runtime',
      semanticScope: 'shared runtime ownership',
      affectedPaths: ['apps/orchestrator/src'],
    });
    await acquireTaskDispatchClaim({
      tenantSlug: 'tenant-b',
      requestId: 'claim-b',
      taskId: 'wp-b',
      workstream: 'orchestrator',
      conflictKey: 'orchestrator/shared-runtime',
      semanticScope: 'shared runtime ownership',
      affectedPaths: ['apps/orchestrator/src'],
    });

    const first = redis.eval.mock.calls[0]!;
    const second = redis.eval.mock.calls[1]!;
    // Exact task identity remains tenant-local.
    expect(first[2]).not.toBe(second[2]);
    // conflict / semantic / path keys protect the same repository checkout.
    expect(first[3]).toBe(second[3]);
    expect(first[4]).toBe(second[4]);
    expect(first[5]).toBe(second[5]);
    expect(String(first[3])).toContain(':repository:conflict:');
  });

  it('returns JOIN_EXISTING for an exact task claim collision', async () => {
    redis.eval.mockResolvedValueOnce([
      0,
      1,
      'owner-claim|{"task_id":"wp-owner","workstream":"orchestrator"}',
    ]);

    const result = await acquireTaskDispatchClaim({
      tenantSlug: 'local',
      requestId: 'claim-2',
      taskId: 'wp-owner',
      workstream: 'orchestrator',
      conflictKey: 'other-key',
      affectedPaths: [],
    });

    expect(result.acquired).toBe(false);
    if (!result.acquired) {
      expect(result.conflict.decision).toBe('JOIN_EXISTING');
      expect(result.conflict.existingTaskId).toBe('wp-owner');
    }
  });

  it('returns ALREADY_DONE when the exact task has a completed tombstone', async () => {
    redis.eval.mockResolvedValueOnce([
      0,
      1,
      'completed-claim|{"task_id":"wp-done","workstream":"orchestrator","state":"completed"}',
    ]);

    const result = await acquireTaskDispatchClaim({
      tenantSlug: 'local',
      requestId: 'claim-new',
      taskId: 'wp-done',
      workstream: 'orchestrator',
      conflictKey: 'orchestrator/next-scope',
      affectedPaths: [],
    });

    expect(result.acquired).toBe(false);
    if (!result.acquired) {
      expect(result.conflict.decision).toBe('ALREADY_DONE');
      expect(result.conflict.existingTaskId).toBe('wp-done');
    }
  });

  it('returns CONFLICT_BLOCKED for a semantic/conflict/path collision', async () => {
    redis.eval.mockResolvedValueOnce([
      0,
      2,
      'owner-claim|{"task_id":"wp-owner","workstream":"health-travel"}',
    ]);

    const result = await acquireTaskDispatchClaim({
      tenantSlug: 'local',
      requestId: 'claim-3',
      taskId: 'wp-new',
      workstream: 'health-travel',
      conflictKey: 'health-travel/revenue-consumer',
      semanticScope: 'health travel revenue consumer',
      affectedPaths: [],
    });

    expect(result.acquired).toBe(false);
    if (!result.acquired) {
      expect(result.conflict.descriptor.dimension).toBe('conflict');
      expect(result.conflict.decision).toBe('CONFLICT_BLOCKED');
      expect(result.conflict.existingTaskId).toBe('wp-owner');
    }
  });

  it('on success keeps the exact task tombstone and releases broader scopes', async () => {
    redis.eval.mockResolvedValueOnce([1, 2]);
    const result = await completeTaskDispatchClaim({
      version: 'dispatch-claim-v1',
      claimId: 'claim-done',
      tenantSlug: 'local',
      taskId: 'wp-done',
      workstream: 'orchestrator',
      descriptors: [
        { dimension: 'task', value: 'wp-done' },
        { dimension: 'conflict', value: 'orchestrator/claim' },
        { dimension: 'semantic', value: 'exclusive work' },
      ],
      acquiredAt: '2026-09-13T18:00:00.000Z',
      expiresAt: '2026-09-13T22:00:00.000Z',
    });

    expect(result).toEqual({ tombstoneWritten: true, released: 2 });
    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(redis.eval.mock.calls[0]!.join(' ')).toContain('"state":"completed"');
  });

  it('releases only through the claim-owned Redis compare/delete script', async () => {
    redis.eval.mockResolvedValueOnce(3);
    const released = await releaseTaskDispatchClaim({
      version: 'dispatch-claim-v1',
      claimId: 'claim-4',
      tenantSlug: 'local',
      taskId: 'wp-4',
      workstream: 'orchestrator',
      descriptors: [
        { dimension: 'task', value: 'wp-4' },
        { dimension: 'conflict', value: 'orchestrator/claim' },
        { dimension: 'semantic', value: 'exclusive work' },
      ],
      acquiredAt: '2026-09-13T18:00:00.000Z',
      expiresAt: '2026-09-13T22:00:00.000Z',
    });

    expect(released).toBe(3);
    expect(redis.eval).toHaveBeenCalledTimes(1);
    expect(redis.eval.mock.calls[0]!.at(-1)).toBe('claim-4');
  });

  it('rejects forged/incomplete leases when a worker tries to release them', () => {
    expect(
      parseDispatchClaimLease({
        version: 'dispatch-claim-v1',
        claimId: 'x',
        tenantSlug: 'local',
      })
    ).toBeNull();
  });
});