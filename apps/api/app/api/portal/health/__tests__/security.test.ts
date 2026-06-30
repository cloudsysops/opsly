import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as portalHealth from '@/lib/portal-health-json';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit')>();
  return {
    ...actual,
    extractIp: vi.fn(),
  };
});

// Mock respondPortalTenantHealth to avoid DB calls
vi.mock('@/lib/portal-health-json', () => ({
  respondPortalTenantHealth: vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
}));

describe('GET /api/portal/health security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });
    vi.mocked(audit.extractIp).mockReturnValue('1.2.3.4');

    const request = new Request('http://localhost/api/portal/health?slug=test-tenant');
    const response = await GET(request);

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('portal-health:1.2.3.4');
  });

  it('allows request when rate limit is not exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });
    vi.mocked(audit.extractIp).mockReturnValue('1.2.3.4');

    const request = new Request('http://localhost/api/portal/health?slug=test-tenant');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
