import { describe, expect, it, vi } from 'vitest';
import { GET as h } from '../health/route';
import { GET as n } from '../nodes/status/route';
import { GET as c } from '../capabilities/route';
import { GET as s } from '../stream/route';

vi.mock('../../../../lib/runtime-proxy', () => ({
  proxyRuntimeOrchestrator: vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
  ORCHESTRATOR_INTERNAL_URL: 'http://orchestrator:3011',
}));

describe('Runtime API Auth', () => {
  const req = new Request('http://x');
  it('health requires auth', async () => expect((await h(req)).status).toBe(401));
  it('nodes requires auth', async () => expect((await n(req)).status).toBe(401));
  it('capabilities requires auth', async () => expect((await c(req)).status).toBe(401));
  it('stream requires auth', async () => expect((await s(req)).status).toBe(401));
});
