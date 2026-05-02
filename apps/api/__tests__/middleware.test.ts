import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const checkRateLimitMock = vi.hoisted(() => vi.fn());
const pickCorsOriginMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/rate-limiter', () => ({
  checkRateLimit: checkRateLimitMock,
  RATE_LIMIT_MAX_REQUESTS: 100,
}));

vi.mock('../lib/cors-origins', () => ({
  pickCorsOrigin: pickCorsOriginMock,
}));

import { middleware } from '../middleware';

describe('middleware rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pickCorsOriginMock.mockReturnValue(null);
  });

  it('omite rate limiting cuando la request no resuelve tenant', async () => {
    const response = await middleware(new NextRequest('http://localhost/api/health'));

    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(response.headers.get('X-RateLimit-Limit')).toBeNull();
  });

  it('aplica rate limiting usando el slug del path', async () => {
    const resetAt = new Date('2026-04-11T01:00:00.000Z');
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 42,
      resetAt,
    });

    const response = await middleware(
      new NextRequest('http://localhost/api/portal/tenant/acme/usage')
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith('acme');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('42');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(
      String(Math.floor(resetAt.getTime() / 1000))
    );
  });

  it('tenant isolation: x-tenant-slug header takes precedence over path slug for rate limit key', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetAt: new Date('2026-04-11T02:00:00.000Z'),
    });

    await middleware(
      new NextRequest('http://localhost/api/portal/tenant/path-tenant/usage', {
        headers: { 'x-tenant-slug': 'header-tenant' },
      })
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith('header-tenant');
  });

  it('tenant isolation: metrics routes under /api/metrics/tenant/:slug use slug for rate limit', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 7,
      resetAt: new Date('2026-04-11T03:00:00.000Z'),
    });

    await middleware(new NextRequest('http://localhost/api/metrics/tenant/smiletripcare'));

    expect(checkRateLimitMock).toHaveBeenCalledWith('smiletripcare');
  });

  it('resuelve tenant desde el JWT cuando el path no lo expone', async () => {
    const payload = Buffer.from(
      JSON.stringify({ user_metadata: { tenant_slug: 'jwt-tenant' } })
    ).toString('base64url');

    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date('2026-04-11T01:00:00.000Z'),
    });

    await middleware(
      new NextRequest('http://localhost/api/portal/me', {
        headers: { authorization: `Bearer header.${payload}.signature` },
      })
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith('jwt-tenant');
  });

  it('devuelve 429 cuando el tenant supera el límite', async () => {
    const resetAt = new Date('2026-04-11T01:00:30.000Z');
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt,
    });

    const response = await middleware(
      new NextRequest('http://localhost/api/portal/tenant/acme/usage')
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: 'Too many requests',
      tenant: 'acme',
    });
    expect(response.headers.get('Retry-After')).not.toBeNull();
  });
});
