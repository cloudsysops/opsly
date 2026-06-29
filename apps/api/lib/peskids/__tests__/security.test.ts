import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { postPublicPeskidsLead } from '../public-lead-post';
import { postPublicPeskidsFeedback } from '../public-feedback-post';
import * as rateLimiter from '../../rate-limiter';
import * as audit from '../../audit';
import * as assertTenant from '../assert-tenant';
import * as repository from '../repository';

vi.mock('../../rate-limiter', () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock('../../audit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../audit')>();
  return {
    ...actual,
    logAuditEvent: vi.fn(),
    extractIp: vi.fn(),
  };
});

vi.mock('../assert-tenant', () => ({
  assertPeskidsTenantPublic: vi.fn(),
}));

vi.mock('../repository', () => ({
  peskidsInsertLead: vi.fn(),
  peskidsInsertFeedback: vi.fn(),
}));

describe('Peskids Public Endpoints Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertTenant.assertPeskidsTenantPublic).mockResolvedValue(null);
  });

  describe('postPublicPeskidsLead', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/public/peskids/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Maria Rodriguez',
          email: 'maria@example.com',
          phone: '+573001112233',
          class_modality: 'llanogrande',
          neighborhood: 'El Porvenir',
          grade_interested: 'K-5',
        }),
      });

      const response = await postPublicPeskidsLead(request);
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe('Too many requests');
    });

    it('logs an audit event on successful lead creation', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });

      vi.mocked(repository.peskidsInsertLead).mockResolvedValue({
        ok: true,
        row: {
          id: 'row-id',
          tenant_slug: 'peskids',
          lead_id: 'lead-id',
          source: 'test',
          created_at: new Date().toISOString(),
        } as any,
      });

      const request = new NextRequest('http://localhost/api/public/peskids/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Maria Rodriguez',
          email: 'maria@example.com',
          phone: '+573001112233',
          class_modality: 'llanogrande',
          neighborhood: 'El Porvenir',
          grade_interested: 'K-5',
        }),
      });

      const response = await postPublicPeskidsLead(request);
      expect(response.status).toBe(201);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        tenant_slug: 'peskids',
        action: 'CREATE',
        resource: 'peskids:lead:row-id',
      }));
    });
  });

  describe('postPublicPeskidsFeedback', () => {
    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = new NextRequest('http://localhost/api/public/peskids/feedback', {
        method: 'POST',
        body: JSON.stringify({
          child_name: 'Mateo',
          satisfaction: 5,
        }),
      });

      const response = await postPublicPeskidsFeedback(request);
      expect(response.status).toBe(429);
    });

    it('logs an audit event on successful feedback submission', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });

      vi.mocked(repository.peskidsInsertFeedback).mockResolvedValue({
        ok: true,
        row: {
          id: 'f-id',
          tenant_slug: 'peskids',
          satisfaction: 5,
          created_at: new Date().toISOString(),
        } as any,
      });

      const request = new NextRequest('http://localhost/api/public/peskids/feedback', {
        method: 'POST',
        body: JSON.stringify({
          child_name: 'Mateo',
          satisfaction: 5,
        }),
      });

      const response = await postPublicPeskidsFeedback(request);
      expect(response.status).toBe(201);
      expect(audit.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        tenant_slug: 'peskids',
        action: 'CREATE',
        resource: 'peskids:feedback:f-id',
      }));
    });
  });
});
