import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import * as rateLimiter from '../../../../../lib/rate-limiter';
import * as audit from '../../../../../lib/audit';

const ADMIN_TOKEN_KEY = 'test-admin-token';
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const REMAINING_LIMIT = 99;

vi.mock('../../../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../../../../lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

vi.mock('../../../../../lib/super-admin-auth', () => ({
  resolveSuperAdminSession: vi.fn().mockResolvedValue({ ok: false, response: { status: 401 } }),
}));

describe('Outreach Template Route Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN_KEY;
  });

  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_TOKEN;
  });

  describe('GET handler', () => {
    it('returns 401 if unauthorized', async () => {
      const request = new NextRequest('http://localhost/api/growth/outreach-template');
      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS_UNAUTHORIZED);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN_KEY}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS_TOO_MANY_REQUESTS);
      const body = await response.json();
      expect(body.error).toBe('Too many requests');
    });

    it('returns 400 on missing parameters and does not log audit', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: REMAINING_LIMIT,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template?name=John', {
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN_KEY}`,
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS_BAD_REQUEST);
      expect(audit.logAuditEvent).not.toHaveBeenCalled();
    });

    it('returns 200 on success and logs audit event with masked email', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: REMAINING_LIMIT,
        resetAt: new Date(),
      });

      const request = new NextRequest(
        'http://localhost/api/growth/outreach-template?name=John&email=john.doe@example.com',
        {
          headers: {
            authorization: `Bearer ${ADMIN_TOKEN_KEY}`,
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'outreach_template_generate',
          resource: 'outreach-template:j***e@example.com',
          metadata: expect.objectContaining({
            recipient_masked: 'j***e@example.com',
          }),
        })
      );
    });
  });

  describe('POST handler', () => {
    it('returns 401 if unauthorized', async () => {
      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS_UNAUTHORIZED);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN_KEY}`,
        },
        body: JSON.stringify({
          name: 'John',
          email: 'john.doe@example.com',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS_TOO_MANY_REQUESTS);
    });

    it('returns 400 on missing parameters and does not log audit', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: REMAINING_LIMIT,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN_KEY}`,
        },
        body: JSON.stringify({
          name: 'John',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS_BAD_REQUEST);
      expect(audit.logAuditEvent).not.toHaveBeenCalled();
    });

    it('returns 200 on success and logs audit event with masked email', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: REMAINING_LIMIT,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/growth/outreach-template', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN_KEY}`,
        },
        body: JSON.stringify({
          name: 'John',
          email: 'john.doe@example.com',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS_OK);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'outreach_template_generate',
          resource: 'outreach-template:j***e@example.com',
          metadata: expect.objectContaining({
            recipient_masked: 'j***e@example.com',
          }),
        })
      );
    });
  });
});
