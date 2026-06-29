import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as rateLimiter from '../../../../../../../../lib/rate-limiter';
import * as audit from '../../../../../../../../lib/audit';

vi.mock('../../../../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../../../../lib/audit')>();
  return {
    ...actual,
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

describe('GET /api/local-services/public/tenants/[slug]/available-slots security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const request = new NextRequest('http://localhost/api/local-services/public/tenants/acme/available-slots?date=2026-06-20&service_external_id=test', {
      method: 'GET',
    });

    const response = await GET(request, { params: Promise.resolve({ slug: 'acme' }) });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('Too many requests');
    expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith('ls-public-slots:127.0.0.1');
  });
});
