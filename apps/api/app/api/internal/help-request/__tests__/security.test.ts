import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, PATCH } from '../route';
import * as rateLimiter from '@/lib/rate-limiter';
import * as audit from '@/lib/audit';
import * as helpStore from '@/lib/help-request-store';
import * as auth from '@/lib/auth';

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('@/lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  };
});

vi.mock('@/lib/help-request-store', () => ({
  createHelpRequest: vi.fn(),
  resolveHelpRequestRecord: vi.fn(),
  listPendingHelpRequests: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminToken: vi.fn().mockReturnValue(null),
}));

describe('Internal Help Request API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireAdminToken).mockReturnValue(null);
  });

  describe('POST /api/internal/help-request', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/internal/help-request', {
        method: 'POST',
        body: JSON.stringify({
          jobId: 'job-123',
          jobName: 'test-job',
          errorMessage: 'something failed',
          suggestedAction: 'fix it',
          blockageType: 'permission',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Too many requests');
    });

    it('logs an audit event on successful creation', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });

      vi.mocked(helpStore.createHelpRequest).mockResolvedValue({
        id: 'help-123',
        jobId: 'job-123',
        jobName: 'test-job',
        tenantSlug: 'platform',
        blockageType: 'permission',
        errorMessage: 'error',
        context: {},
        suggestedAction: 'fix',
        timestamp: new Date().toISOString(),
        status: 'pending',
      });

      const request = new NextRequest('http://localhost/api/internal/help-request', {
        method: 'POST',
        body: JSON.stringify({
          jobId: 'job-123',
          jobName: 'test-job',
          errorMessage: 'something failed',
          suggestedAction: 'fix it',
          blockageType: 'permission',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'create_help_request',
        resource: 'help-request:help-123',
      }));
    });
  });

  describe('PATCH /api/internal/help-request', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/internal/help-request', {
        method: 'PATCH',
        body: JSON.stringify({
          helpId: 'help-123',
          resolution: 'fixed',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(429);
    });

    it('logs an audit event on successful resolution', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetAt: new Date(),
      });

      vi.mocked(helpStore.resolveHelpRequestRecord).mockResolvedValue({
        id: 'help-123',
        jobId: 'job-123',
        jobName: 'test-job',
        tenantSlug: 'platform',
        blockageType: 'permission',
        errorMessage: 'error',
        context: {},
        suggestedAction: 'fix',
        timestamp: new Date().toISOString(),
        status: 'resolved',
        resolution: 'fixed',
      });

      const request = new NextRequest('http://localhost/api/internal/help-request', {
        method: 'PATCH',
        body: JSON.stringify({
          helpId: 'help-123',
          resolution: 'fixed',
        }),
      });

      const response = await PATCH(request);
      expect(response.status).toBe(200);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        action: 'resolve_help_request',
        resource: 'help-request:help-123',
      }));
    });
  });
});
