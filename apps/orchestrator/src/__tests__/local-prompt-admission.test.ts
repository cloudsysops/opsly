import type { IncomingMessage } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
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
  queueCounts: Record<string, number> = {}
): LocalPromptAdmissionDependencies {
  return {
    increment: async () => returnedCounts,
    queueCounts: async () => queueCounts,
    now: () => 120_000,
  };
}

afterEach(() => {
  delete process.env.OPSLY_LOCAL_PROMPT_RATE_TOKEN;
  delete process.env.OPSLY_LOCAL_PROMPT_RATE_IP;
  delete process.env.OPSLY_LOCAL_PROMPT_RATE_TENANT;
  delete process.env.OPSLY_LOCAL_PROMPT_QUEUE_MAX;
});

describe('local prompt admission', () => {
  it('admits a request below token, IP, tenant and queue limits', async () => {
    const result = await checkLocalPromptAdmission(
      request({ authorization: 'Bearer test' }),
      'local',
      deps([1, 1, 1], { waiting: 1, active: 1 })
    );
    expect(result).toEqual({ ok: true });
  });

  it.each([
    [[31, 1, 1], 'rate_limit_token'],
    [[1, 61, 1], 'rate_limit_ip'],
    [[1, 1, 21], 'rate_limit_tenant'],
  ] as const)('fails closed when a dimension exceeds its limit', async (counts, reason) => {
    const result = await checkLocalPromptAdmission(request(), 'local', deps([...counts]));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(reason);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('rejects when total outstanding queue depth reaches the global cap', async () => {
    process.env.OPSLY_LOCAL_PROMPT_QUEUE_MAX = '4';
    const result = await checkLocalPromptAdmission(
      request(),
      'local',
      deps([1, 1, 1], { waiting: 1, active: 1, delayed: 1, prioritized: 1 })
    );
    expect(result).toEqual({
      ok: false,
      reason: 'queue_capacity',
      retryAfterSeconds: 30,
      queueDepth: 4,
    });
  });
});
