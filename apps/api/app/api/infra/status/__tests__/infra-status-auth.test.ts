import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as auth from '../../../../../lib/auth';
import * as heartbeat from '../../../../../lib/infra/heartbeat';
import { GET } from '../route';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/infra/heartbeat', () => ({
  requireHeartbeatRedis: vi.fn(),
  classifyHeartbeat: vi.fn().mockReturnValue({ name: 'test', status: 'healthy' }),
  heartbeatKey: vi.fn().mockReturnValue('heartbeat:test'),
}));

describe('Infra Status Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks a regular portal user from accessing infra status', async () => {
    // Mock requireAdminAccess to fail as it would for a regular user
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(
      new Response('Unauthorized', { status: 401 })
    );

    const req = new NextRequest('https://opsly.test/api/infra/status', {
      headers: { Authorization: 'Bearer portal-token' },
    });

    const res = await GET(req as any);

    expect(res.status).toBe(401);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });

  it('allows an admin to access infra status', async () => {
    // Mock requireAdminAccess to succeed
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);

    // Mock redis
    const mockRedis = {
      scanIterator: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield ['heartbeat:api'];
        },
      }),
      get: vi.fn().mockResolvedValue('{}'),
      ttl: vi.fn().mockResolvedValue(60),
    };
    vi.mocked(heartbeat.requireHeartbeatRedis).mockResolvedValue(mockRedis as any);

    const req = new NextRequest('https://opsly.test/api/infra/status', {
      headers: { Authorization: 'Bearer admin-token' },
    });

    const res = await GET(req as any);

    expect(res.status).toBe(200);
    expect(auth.requireAdminAccess).toHaveBeenCalled();
  });
});
