import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET as healthGet } from '../health/route';
import { GET as nodesStatusGet } from '../nodes/status/route';
import { GET as capabilitiesGet } from '../capabilities/route';
import { GET as streamGet } from '../stream/route';

vi.mock('../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
  ORCHESTRATOR_INTERNAL_URL: 'http://orchestrator:3011',
}));

describe('Runtime API Authorization', () => {
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = 'secret-token';
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  it('GET /api/runtime/health returns 401 without token', async () => {
    const res = await healthGet(new Request('http://x'));
    expect(res.status).toBe(401);
  });

  it('GET /api/runtime/nodes/status returns 401 without token', async () => {
    const res = await nodesStatusGet(new Request('http://x'));
    expect(res.status).toBe(401);
  });

  it('GET /api/runtime/capabilities returns 401 without token', async () => {
    const res = await capabilitiesGet(new Request('http://x'));
    expect(res.status).toBe(401);
  });

  it('GET /api/runtime/stream returns 401 without token', async () => {
    const res = await streamGet(new Request('http://x'));
    expect(res.status).toBe(401);
  });
});
