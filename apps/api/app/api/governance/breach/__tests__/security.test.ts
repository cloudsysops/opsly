import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import * as rl from '@/lib/rate-limiter';
import * as au from '@/lib/audit';
import * as sb from '@/lib/supabase';
vi.mock('@/lib/rate-limiter', () => ({ checkRateLimit: vi.fn() }));
vi.mock('@/lib/audit', async (o) => ({ ...(await o<any>()), logAuditEvent: vi.fn(), extractIp: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ getServiceClient: vi.fn() }));
describe('POST /api/governance/breach security', () => {
  it('enforces rate limits and logs audits', async () => {
    process.env.GOVERNANCE_BREACH_SECRET = 's';
    vi.mocked(rl.checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: new Date() });
    expect((await POST(new NextRequest('http://l/a', { method: 'POST' }))).status).toBe(429);
    vi.mocked(rl.checkRateLimit).mockResolvedValue({ allowed: true, remaining: 1, resetAt: new Date() });
    vi.mocked(sb.getServiceClient).mockReturnValue({ schema: () => ({ from: () => ({ insert: () => ({ select: () => ({ single: () => ({ data: { id: '1' } }) }) }) }) }) } as any);
    const body = JSON.stringify({ tenant_id: 't', title: 'b', description: 'd', discovered_at: new Date().toISOString(), severity: 'high' });
    const res = await POST(new NextRequest('http://l/a', { method: 'POST', headers: { authorization: 'Bearer s' }, body }));
    expect(res.status).toBe(201);
    expect(au.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ tenant_slug: 't', action: 'CREATE' }));
  });
});
