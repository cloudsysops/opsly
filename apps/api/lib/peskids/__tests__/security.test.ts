import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { postPublicPeskidsLead } from '../public-lead-post';
import { postPublicPeskidsFeedback } from '../public-feedback-post';
import * as rateLimiter from '../../rate-limiter';
import * as audit from '../../audit';
import * as assertTenant from '../assert-tenant';
import * as repository from '../repository';
import type { PeskidsFeedbackRow, PeskidsLeadRow } from '../repository';
import * as hotLeadAlert from '../hot-lead-alert';
import * as leadConfirmation from '../lead-confirmation-email';

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

vi.mock('../hot-lead-alert', () => ({
  dispatchPeskidsHotLeadAlert: vi.fn().mockResolvedValue({
    ok: true,
    status: 'skipped',
    detail: 'mocked',
    delivery_id: 'hot-lead:mocked',
  }),
}));

vi.mock('../lead-confirmation-email', () => ({
  dispatchPeskidsLeadConfirmationEmail: vi.fn().mockResolvedValue({
    ok: true,
    status: 'skipped',
    detail: 'mocked',
    idempotency_key: 'lead-confirmation:mocked',
  }),
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

      const leadRow: PeskidsLeadRow = {
        id: 'row-id',
        tenant_slug: 'peskids',
        full_name: 'Maria Rodriguez',
        email: 'maria@example.com',
        phone: '+573001112233',
        class_modality: 'llanogrande',
        neighborhood: 'El Porvenir',
        grade_interested: 'K-5',
        referral_source: null,
        status: 'new',
        admin_notes: null,
        created_at: new Date().toISOString(),
      };
      vi.mocked(repository.peskidsInsertLead).mockResolvedValue({
        ok: true,
        row: leadRow,
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
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_slug: 'peskids',
          action: 'CREATE',
          resource: 'peskids:lead:row-id',
        })
      );
      expect(hotLeadAlert.dispatchPeskidsHotLeadAlert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'row-id', tenant_slug: 'peskids' })
      );
      expect(leadConfirmation.dispatchPeskidsLeadConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'row-id', email: 'maria@example.com' })
      );
    });

    it('returns 201 even if the hot-lead alert dispatch rejects', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      const leadRow2: PeskidsLeadRow = {
        id: 'row-id-2',
        tenant_slug: 'peskids',
        full_name: 'Maria Rodriguez',
        email: 'maria@example.com',
        phone: '+573001112233',
        class_modality: 'llanogrande',
        neighborhood: 'El Porvenir',
        grade_interested: 'K-5',
        referral_source: null,
        status: 'new',
        admin_notes: null,
        created_at: new Date().toISOString(),
      };
      vi.mocked(repository.peskidsInsertLead).mockResolvedValue({
        ok: true,
        row: leadRow2,
      });
      vi.mocked(hotLeadAlert.dispatchPeskidsHotLeadAlert).mockRejectedValueOnce(
        new Error('n8n unreachable')
      );

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
    });

    it('returns 201 even if the confirmation email dispatch rejects', async () => {
      vi.mocked(rateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetAt: new Date(),
      });
      const leadRow3: PeskidsLeadRow = {
        id: 'row-id-3',
        tenant_slug: 'peskids',
        full_name: 'Maria Rodriguez',
        email: 'maria@example.com',
        phone: '+573001112233',
        class_modality: 'llanogrande',
        neighborhood: 'El Porvenir',
        grade_interested: 'K-5',
        referral_source: null,
        status: 'new',
        admin_notes: null,
        created_at: new Date().toISOString(),
      };
      vi.mocked(repository.peskidsInsertLead).mockResolvedValue({
        ok: true,
        row: leadRow3,
      });
      vi.mocked(leadConfirmation.dispatchPeskidsLeadConfirmationEmail).mockRejectedValueOnce(
        new Error('resend unreachable')
      );

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

      const feedbackRow: PeskidsFeedbackRow = {
        id: 'f-id',
        tenant_slug: 'peskids',
        child_name: 'Mateo',
        satisfaction: 5,
        suggestion: null,
        contact_me_back: false,
        status: 'new',
        created_at: new Date().toISOString(),
      };
      vi.mocked(repository.peskidsInsertFeedback).mockResolvedValue({
        ok: true,
        row: feedbackRow,
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
      expect(audit.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_slug: 'peskids',
          action: 'CREATE',
          resource: 'peskids:feedback:f-id',
        })
      );
    });
  });
});
