import { execFile } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getRedisClientMock = vi.hoisted(() => vi.fn());

vi.mock('../src/cache.js', async () => {
  const actual = await vi.importActual<typeof import('../src/cache.js')>('../src/cache.js');
  return {
    ...actual,
    getRedisClient: (...args: unknown[]) => getRedisClientMock(...args),
  };
});

import { enrichContext } from '../src/context-enricher.js';
import type { DetectedIntent } from '../src/types.js';

const intentStub: DetectedIntent = {
  intent: 'question',
  confidence: 0.9,
  affected_area: 'backend',
  urgency: 'low',
  suggested_team: 'backend-team',
};

describe('context-enricher', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as
        | ((err: Error | null, so?: string | Buffer, se?: string | Buffer) => void)
        | undefined;
      if (typeof cb === 'function') {
        cb(null, Buffer.from('apps/api/health/route.ts\n'), Buffer.from(''));
      }
      return {} as ReturnType<typeof execFile>;
    });
    getRedisClientMock.mockResolvedValue({
      lRange: vi.fn().mockResolvedValue(['session preview one']),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('combina repo + sesiones cuando Redis responde', async () => {
    const ctx = await enrichContext('tenant-a', 'health check endpoint', intentStub);
    expect(ctx.repo.paths.length).toBeGreaterThan(0);
    expect(ctx.sessions.length).toBe(1);
    expect(ctx.errors.length).toBe(0);
  });

  it('añade sessions:timeout si Redis no responde a tiempo', async () => {
    vi.useFakeTimers();
    getRedisClientMock.mockResolvedValue({
      lRange: vi.fn().mockReturnValue(new Promise(() => undefined)),
    });
    const done = enrichContext('tenant-a', 'keywordtest enrich', intentStub);
    await vi.advanceTimersByTimeAsync(3100);
    const ctx = await done;
    expect(ctx.errors).toContain('sessions:timeout');
    expect(ctx.sessions).toEqual([]);
  });

  it('repo vacío si rg falla', async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const cb = args[args.length - 1] as (err: Error | null, so?: string) => void;
      if (typeof cb === 'function') {
        void Promise.resolve().then(() => cb(new Error('rg failed')));
      }
      return {} as ReturnType<typeof execFile>;
    });
    const ctx = await enrichContext('tenant-a', 'onlystop', intentStub);
    expect(ctx.repo.paths).toEqual([]);
  });
});
