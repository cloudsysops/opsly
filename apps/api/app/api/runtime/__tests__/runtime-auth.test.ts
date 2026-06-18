import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as getHealth } from '../health/route';
import { GET as getNodesStatus } from '../nodes/status/route';
import { GET as getCapabilities } from '../capabilities/route';
import { GET as getStream } from '../stream/route';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';

vi.mock('../../../../lib/auth', () => ({
  requireAdminAccessUnlessDemoRead: vi.fn(),
}));

vi.mock('../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: vi.fn().mockResolvedValue(new Response('{}')),
  ORCHESTRATOR_INTERNAL_URL: 'http://orchestrator:3011',
}));

describe('Runtime API Security Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const routes = [
    { name: 'GET /api/runtime/health', handler: getHealth },
    { name: 'GET /api/runtime/nodes/status', handler: getNodesStatus },
    { name: 'GET /api/runtime/capabilities', handler: getCapabilities },
    { name: 'GET /api/runtime/stream', handler: getStream },
  ];

  routes.forEach(({ name, handler }) => {
    describe(name, () => {
      it('should return 401 when admin access is denied', async () => {
        vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(
          Response.json({ error: 'Unauthorized' }, { status: 401 })
        );
        const req = new Request(`http://localhost${name.split(' ')[1]}`);
        const res = await handler(req);
        expect(res.status).toBe(401);
      });

      it('should return 403 when admin access is forbidden', async () => {
        vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(
          Response.json({ error: 'Forbidden' }, { status: 403 })
        );
        const req = new Request(`http://localhost${name.split(' ')[1]}`);
        const res = await handler(req);
        expect(res.status).toBe(403);
      });
    });
  });
});
