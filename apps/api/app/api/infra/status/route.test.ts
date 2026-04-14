import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as heartbeatMod from '../../../../lib/infra/heartbeat';
import * as portalDalMod from '../../../../lib/portal-tenant-dal';
import { GET as infraStatusGet } from './route';

vi.mock('../../../../lib/portal-tenant-dal', () => ({
  runTrustedPortalDal: vi.fn(),
}));

vi.mock('../../../../lib/infra/heartbeat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/infra/heartbeat')>();
  return {
    ...actual,
    requireHeartbeatRedis: vi.fn(),
  };
});

describe('GET /api/infra/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies access without token (401)', async () => {
    vi.mocked(portalDalMod.runTrustedPortalDal).mockResolvedValue(
      new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    );

    const res = await infraStatusGet(new Request('http://localhost/api/infra/status'));

    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.services).toBeUndefined();
  });

  it('returns services with valid token/session', async () => {
    vi.mocked(portalDalMod.runTrustedPortalDal).mockImplementation(async (_req, fn) => {
      return fn();
    });

    const redisMock = {
      async *scanIterator() {
        yield 'heartbeat:api';
      },
      get: vi.fn(async (key: string) => {
        if (key === 'heartbeat:api') {
          return JSON.stringify({
            ts: Date.now() - 5_000,
            metadata: { path: '/api/portal/me' },
          });
        }
        if (key === 'heartbeat:orchestrator') {
          return JSON.stringify({
            ts: Date.now() - 12_000,
            metadata: { uptime: '120' },
          });
        }
        return null;
      }),
      ttl: vi.fn(async (key: string) => {
        if (key === 'heartbeat:api') {
          return 45;
        }
        if (key === 'heartbeat:orchestrator') {
          return 52;
        }
        return -2;
      }),
    };

    vi.mocked(heartbeatMod.requireHeartbeatRedis).mockResolvedValue(redisMock as never);

    const res = await infraStatusGet(
      new Request('http://localhost/api/infra/status', {
        headers: { authorization: 'Bearer valid-token' },
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      services?: Array<{ name: string; status: string }>;
    };
    expect(Array.isArray(body.services)).toBe(true);
    expect(body.services?.some((s) => s.name === 'api')).toBe(true);
    expect(body.services?.some((s) => s.name === 'orchestrator')).toBe(true);
  });
});
