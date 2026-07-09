import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import * as audit from '../../../../../lib/audit';
import * as auth from '../../../../../lib/auth';

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

describe('Growth Outreach Template API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireAdminAccess).mockResolvedValue(null);
  });

  describe('GET /api/growth/outreach-template', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template?name=John&email=john@example.com');
      const response = await GET(request);

      expect(response.status).toBe(429);
    });

    it('logs an audit event on successful GET request', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template?name=John&email=john@example.com');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'outreach_template_generate',
        metadata: expect.objectContaining({
          method: 'GET',
          recipient_email: 'john@example.com',
        }),
      }));
    });
  });

  describe('POST /api/growth/outreach-template', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(429);
    });

    it('logs an audit event on successful POST request', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'outreach_template_generate',
        metadata: expect.objectContaining({
          method: 'POST',
          recipient_email: 'john@example.com',
        }),
      }));
    });
  });

  describe('XSS Protection', () => {
    it('escapes user input in HTML response', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });

      const maliciousName = '<script>alert("xss")</script>';
      const request = new NextRequest(`http://localhost/api/growth/outreach-template?name=${encodeURIComponent(maliciousName)}&email=john@example.com`);
      const response = await GET(request);
      const data = await response.json();

      expect(data.html).not.toContain(maliciousName);
      expect(data.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });
  });
});
