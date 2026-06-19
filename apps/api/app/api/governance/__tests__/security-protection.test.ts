import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as rateLimiter from '@/lib/rate-limiter';
import { POST as consentPost } from '../consent/route';
import { POST as dsarPost } from '../dsar/route';
import { GET as dsarVerifyGet } from '../dsar/[token]/route';

vi.mock('@/lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: '123' }, error: null })),
          })),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: '123', status: 'received' }, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

describe('Governance API Security Protection', () => {
  const SECRET = 'test-governance-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOVERNANCE_BREACH_SECRET = SECRET;
    vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetAt: new Date(),
    });
  });

  describe('POST /api/governance/consent', () => {
    it('rejects requests without authorization header', async () => {
      const req = new NextRequest('http://localhost/api/governance/consent', {
        method: 'POST',
      });
      const res = await consentPost(req);
      expect(res.status).toBe(401);
    });

    it('rejects requests with invalid token', async () => {
      const req = new NextRequest('http://localhost/api/governance/consent', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-token' },
      });
      const res = await consentPost(req);
      expect(res.status).toBe(401);
    });

    it('rejects requests when rate limited', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/governance/consent', {
        method: 'POST',
        headers: { authorization: `Bearer ${SECRET}` },
      });
      const res = await consentPost(req);
      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/governance/dsar', () => {
    it('rejects requests without authorization header', async () => {
      const req = new NextRequest('http://localhost/api/governance/dsar', {
        method: 'POST',
      });
      const res = await dsarPost(req);
      expect(res.status).toBe(401);
    });

    it('rejects requests when rate limited', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/governance/dsar', {
        method: 'POST',
        headers: { authorization: `Bearer ${SECRET}` },
      });
      const res = await dsarPost(req);
      expect(res.status).toBe(429);
    });
  });

  describe('GET /api/governance/dsar/[token]', () => {
    it('rejects requests when rate limited', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const req = new NextRequest('http://localhost/api/governance/dsar/some-token-here', {
        method: 'GET',
      });
      const res = await dsarVerifyGet(req, { params: Promise.resolve({ token: 'some-token-here' }) });
      expect(res.status).toBe(429);
    });
  });
});
