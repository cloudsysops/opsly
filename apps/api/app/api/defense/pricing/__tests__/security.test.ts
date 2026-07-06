import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as auth from '@/lib/auth';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit')>();
  return {
    ...actual,
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

vi.mock('@/lib/auth', () => ({
  requireAdminAccessUnlessDemoRead: vi.fn(),
}));

describe('Defense Pricing API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(auth.requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/defense/pricing');
    const response = await GET(request);

    expect(response.status).toBe(429);
  });

  it('allows access when rate limit is not exceeded', async () => {
    vi.mocked(auth.requireAdminAccessUnlessDemoRead).mockResolvedValue(null);
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/defense/pricing');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
