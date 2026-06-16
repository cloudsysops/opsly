import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { GET as healthGet } from '../health/route';
import { GET as nodesStatusGet } from '../nodes/status/route';
import { GET as capabilitiesGet } from '../capabilities/route';
import { GET as streamGet } from '../stream/route';
import * as proxyMod from '../../../../lib/runtime-proxy';

vi.mock('../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: vi.fn(),
  ORCHESTRATOR_INTERNAL_URL: 'http://orchestrator',
}));

describe('Runtime API Authorization', () => {
  const ADMIN_TOKEN = 'test-admin-token';

  beforeEach(() => {
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;
    vi.clearAllMocks();
    // Mock global fetch for stream/route.ts
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      headers: new Headers(),
    });
  });

  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
    delete process.env.ADMIN_PUBLIC_DEMO_READ;
  });

  it('GET /api/runtime/health returns 401 without admin token', async () => {
    vi.mocked(proxyMod.proxyRuntimeOrchestrator).mockResolvedValue(
      new Response('ok', { status: 200 })
    );

    const res = await healthGet(new Request('http://x'));

    expect(res.status).toBe(401);
    expect(proxyMod.proxyRuntimeOrchestrator).not.toHaveBeenCalled();
  });

  it('GET /api/runtime/health returns 200 with admin token', async () => {
    vi.mocked(proxyMod.proxyRuntimeOrchestrator).mockResolvedValue(
      new Response('ok', { status: 200 })
    );

    const res = await healthGet(
      new Request('http://x', {
        headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
      })
    );

    expect(res.status).toBe(200);
    expect(proxyMod.proxyRuntimeOrchestrator).toHaveBeenCalled();
  });

  it('GET /api/runtime/nodes/status returns 401 without admin token', async () => {
    vi.mocked(proxyMod.proxyRuntimeOrchestrator).mockResolvedValue(
      new Response('ok', { status: 200 })
    );

    const res = await nodesStatusGet(new Request('http://x'));

    expect(res.status).toBe(401);
  });

  it('GET /api/runtime/capabilities returns 401 without admin token', async () => {
    vi.mocked(proxyMod.proxyRuntimeOrchestrator).mockResolvedValue(
      new Response('ok', { status: 200 })
    );

    const res = await capabilitiesGet(new Request('http://x'));

    expect(res.status).toBe(401);
  });

  it('GET /api/runtime/stream returns 401 without admin token', async () => {
    const res = await streamGet(new Request('http://x'));

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows access in demo read mode for GET requests', async () => {
    process.env.ADMIN_PUBLIC_DEMO_READ = 'true';
    vi.mocked(proxyMod.proxyRuntimeOrchestrator).mockResolvedValue(
      new Response('ok', { status: 200 })
    );

    const res = await healthGet(new Request('http://x'));
    expect(res.status).toBe(200);
  });
});
