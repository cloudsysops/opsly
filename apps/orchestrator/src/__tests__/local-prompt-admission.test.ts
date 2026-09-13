import type { IncomingMessage } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkLocalPromptAdmission,
  type LocalPromptAdmissionDependencies,
} from '../http/local-prompt-admission.js';

function request(headers: Record<string, string> = {}): IncomingMessage {
  return {
    headers,
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as IncomingMessage;
}

function deps(
  returnedCounts: number[],
  queueCounts: Record<string, number> = {},
  overrides: Partial<LocalPromptAdmissionDependencies> = {}
): LocalPromptAdmissionDependencies {
  return {
    increment: async () => returnedCounts,
    queueCounts: async () => queueCounts,
    reserveQueueSlot: async (queueDepth, queueLimit) => queueDepth < queueLimit,
    releaseQueueSlot: async () => undefined,
    now: () => 120_000,
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.OPSLY_LOCAL_PROMPT_RATE_TOKEN;
  delete process.env.OPSLY_LOCAL_PROMPT_RATE_IP;
  delete process.env.OPSLY_LOCAL_PROMPT_RATE_TENANT;
  delete process.env.OPSLY_LOCAL_PROMPT_QUEUE_MAX;
  delete process.env.OPSLY_TRUST_PROXY;
});

describe('local prompt admission', () => {
  it('admits a request below token, IP, tenant and queue limits with a queue reservation', async () => {
    const result = await checkLocalPromptAdmission(
      request({ authorization: 'Bearer test' }),
      'local',
      deps([1, 1, 1], { waiting: 1, active: 1 })
    );
    expect(result).toEqual({ ok: true, queueReservation: true });
  });

  it.each([
    [[31, 1, 1], 'rate_limit_token'],
    [[1, 61, 1], 'rate_limit_ip'],
    [[1, 1, 21], 'rate_limit_tenant'],
  ] as const)('fails closed when a dimension exceeds its limit and releases capacity', async (counts, reason) => {
    const releaseQueueSlot = vi.fn(async () => undefined);
    const result = await checkLocalPromptAdmission(
      request(),
      'local',
      deps([...counts], {}, { releaseQueueSlot })
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(reason);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(releaseQueueSlot).toHaveBeenCalledTimes(1);
  });

  it('includes paused jobs when enforcing the global queue cap', async () => {
    process.env.OPSLY_LOCAL_PROMPT_QUEUE_MAX = '4';
    const result = await checkLocalPromptAdmission(
      request(),
      'local',
      deps([1, 1, 1], { paused: 4 })
    );
    expect(result).toEqual({
      ok: false,
      reason: 'queue_capacity',
      retryAfterSeconds: 30,
      queueDepth: 4,
    });
  });

  it('rejects when the atomic reservation reports capacity consumed by a concurrent submitter', async () => {
    process.env.OPSLY_LOCAL_PROMPT_QUEUE_MAX = '4';
    const reserveQueueSlot = vi.fn(async () => false);
    const result = await checkLocalPromptAdmission(
      request(),
      'local',
      deps([1, 1, 1], { waiting: 3 }, { reserveQueueSlot })
    );
    expect(result).toEqual({
      ok: false,
      reason: 'queue_capacity',
      retryAfterSeconds: 30,
      queueDepth: 3,
    });
    expect(reserveQueueSlot).toHaveBeenCalledWith(3, 4, 30_000);
  });

  it('keeps rate limits but skips queue capacity for ide_fallback callers', async () => {
    const queueCounts = vi.fn(async () => ({ waiting: 999 }));
    const reserveQueueSlot = vi.fn(async () => false);
    const result = await checkLocalPromptAdmission(
      request({ authorization: 'Bearer test' }),
      'local',
      deps([1, 1, 1], {}, { queueCounts, reserveQueueSlot }),
      { skipQueueCapacity: true }
    );
    expect(result).toEqual({ ok: true });
    expect(queueCounts).not.toHaveBeenCalled();
    expect(reserveQueueSlot).not.toHaveBeenCalled();
  });

  it('fingerprints the normalized bearer credential so whitespace cannot evade token limits', async () => {
    const tokenKeys: string[] = [];
    const increment = vi.fn(async (keys: string[]) => {
      tokenKeys.push(keys[0]!);
      return [1, 1, 1];
    });
    const sharedDeps = deps([1, 1, 1], {}, { increment });

    await checkLocalPromptAdmission(
      request({ authorization: 'Bearer secret' }),
      'local',
      sharedDeps,
      { skipQueueCapacity: true }
    );
    await checkLocalPromptAdmission(
      request({ authorization: 'Bearer  secret ' }),
      'local',
      sharedDeps,
      { skipQueueCapacity: true }
    );

    expect(tokenKeys).toHaveLength(2);
    expect(tokenKeys[0]).toBe(tokenKeys[1]);
  });
});
