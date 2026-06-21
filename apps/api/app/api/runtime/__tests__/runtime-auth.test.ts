import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as healthGET } from '../health/route';
import { GET as nodesStatusGET } from '../nodes/status/route';
import { GET as capabilitiesGET } from '../capabilities/route';
import { GET as streamGET } from '../stream/route';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';

// Mock dependencies
vi.mock('../../../../lib/auth', () => ({
  requireAdminAccessUnlessDemoRead: vi.fn(),
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
  ORCHESTRATOR_INTERNAL_URL: 'http://orchestrator:3011',
}));

// Mock fetch for the stream endpoint
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  body: new ReadableStream(),
  status: 200,
  headers: new Headers({ 'content-type': 'text/event-stream' }),
});

describe('Runtime API Security Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = 'test-token';
  });

  const endpoints = [
    { name: 'health', handler: healthGET, url: 'http://localhost/api/runtime/health' },
    { name: 'nodes/status', handler: nodesStatusGET, url: 'http://localhost/api/runtime/nodes/status' },
    { name: 'capabilities', handler: capabilitiesGET, url: 'http://localhost/api/runtime/capabilities' },
    { name: 'stream', handler: streamGET, url: 'http://localhost/api/runtime/stream' },
  ];

  endpoints.forEach(({ name, handler, url }) => {
    describe(`${name} endpoint`, () => {
      it('returns 401/403 when access is denied', async () => {
        vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(
          Response.json({ error: 'Unauthorized' }, { status: 401 }) as never
        );

        const res = await handler(new Request(url));
        expect(res.status).toBe(401);
      });

      it('returns 200 when access is granted', async () => {
        vi.mocked(requireAdminAccessUnlessDemoRead).mockResolvedValue(null as never);

        const res = await handler(new Request(url));
        expect(res.status).toBe(200);
      });
    });
  });
});
