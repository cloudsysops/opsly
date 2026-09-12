import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET as executiveGET } from '../[slug]/executive/route';
import { PATCH as stagePATCH } from '../[slug]/leads/[leadId]/stage/route';
import { POST as approvePOST } from '../[slug]/messages/[messageId]/approve/route';
import { GET as pendingMessagesGET } from '../[slug]/messages/pending/route';
import { POST as followupsExecutePOST } from '../[slug]/followups/execute/route';
import { GET as pendingFollowupsGET } from '../[slug]/followups/pending/route';
import { requireAdminAccess } from '../../../../../lib/auth';
import { logAuditEvent } from '../../../../../lib/audit';

vi.mock('../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../lib/audit', () => ({
  extractIp: vi.fn().mockReturnValue('127.0.0.1'),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../../lib/peskids/executive', () => ({
  fetchPeskidsExecutiveSummary: vi.fn().mockResolvedValue({
    tenant_slug: 'peskids',
    generated_at: '2026-06-01T10:00:00.000Z',
    metrics: {},
    pipeline_stages: [],
    alerts: [],
  }),
}));

vi.mock('../../../../../lib/peskids/sales-pipeline', () => ({
  updateLeadStage: vi
    .fn()
    .mockResolvedValue({ ok: true, lead: { id: 'lead-1', stage: 'contacted' } }),
}));

vi.mock('../../../../../lib/peskids/messages', () => ({
  approveMessage: vi.fn().mockResolvedValue({ ok: true, sent_at: '2026-06-01T10:00:00.000Z' }),
  rejectMessage: vi.fn().mockResolvedValue({ ok: true }),
  fetchPendingMessages: vi.fn().mockResolvedValue({ ok: true, messages: [] }),
}));

vi.mock('../../../../../lib/peskids/followup', () => ({
  executePendingFollowups: vi.fn().mockResolvedValue({ processed: 0, failed: 0 }),
  getPendingFollowups: vi.fn().mockResolvedValue({ count: 0, items: [] }),
}));

describe('Peskids Admin Endpoints - Security & Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/peskids/[slug]/executive', () => {
    it('returns 401/403 when requireAdminAccess denies access', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 })
      );
      const res = await executiveGET(
        new Request('http://localhost/api/admin/peskids/peskids/executive'),
        { params: Promise.resolve({ slug: 'peskids' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 404 when slug is not peskids', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const res = await executiveGET(
        new Request('http://localhost/api/admin/peskids/other-slug/executive'),
        { params: Promise.resolve({ slug: 'other-slug' }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/admin/peskids/[slug]/leads/[leadId]/stage', () => {
    it('returns 401/403 when requireAdminAccess denies access', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 })
      );
      const res = await stagePATCH(
        new Request('http://localhost/api/admin/peskids/peskids/leads/lead-1/stage', {
          method: 'PATCH',
          body: JSON.stringify({ stage: 'contacted' }),
        }),
        { params: Promise.resolve({ slug: 'peskids', leadId: 'lead-1' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 404 when slug is not peskids', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const res = await stagePATCH(
        new Request('http://localhost/api/admin/peskids/other-slug/leads/lead-1/stage', {
          method: 'PATCH',
          body: JSON.stringify({ stage: 'contacted' }),
        }),
        { params: Promise.resolve({ slug: 'other-slug', leadId: 'lead-1' }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/peskids/[slug]/messages/[messageId]/approve', () => {
    it('returns 401/403 when requireAdminAccess denies access', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 })
      );
      const res = await approvePOST(
        new Request('http://localhost/api/admin/peskids/peskids/messages/msg-1/approve', {
          method: 'POST',
          body: JSON.stringify({ approved: true }),
        }),
        { params: Promise.resolve({ slug: 'peskids', messageId: 'msg-1' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 404 when slug is not peskids', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const res = await approvePOST(
        new Request('http://localhost/api/admin/peskids/other-slug/messages/msg-1/approve', {
          method: 'POST',
          body: JSON.stringify({ approved: true }),
        }),
        { params: Promise.resolve({ slug: 'other-slug', messageId: 'msg-1' }) }
      );
      expect(res.status).toBe(404);
    });

    it('logs audit event on message approval', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const req = new Request('http://localhost/api/admin/peskids/peskids/messages/msg-1/approve', {
        method: 'POST',
        headers: {
          'x-admin-user': 'supervisor-jane',
          'x-request-id': 'req-1234',
        },
        body: JSON.stringify({ approved: true }),
      });

      const res = await approvePOST(req, {
        params: Promise.resolve({ slug: 'peskids', messageId: 'msg-1' }),
      });

      expect(res.status).toBe(200);
      expect(logAuditEvent).toHaveBeenCalledWith({
        action: 'peskids_message_approved',
        actor_id: 'supervisor-jane',
        tenant_slug: 'peskids',
        resource_id: 'msg-1',
        resource_type: 'peskids_message',
        metadata: {
          approved_by: 'supervisor-jane',
          request_id: 'req-1234',
          sent_at: '2026-06-01T10:00:00.000Z',
          ip: '127.0.0.1',
        },
      });
    });

    it('logs audit event on message rejection', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const req = new Request('http://localhost/api/admin/peskids/peskids/messages/msg-1/approve', {
        method: 'POST',
        headers: {
          'x-admin-user': 'supervisor-jane',
          'x-request-id': 'req-5678',
        },
        body: JSON.stringify({ approved: false, rejection_reason: 'Inappropriate content' }),
      });

      const res = await approvePOST(req, {
        params: Promise.resolve({ slug: 'peskids', messageId: 'msg-1' }),
      });

      expect(res.status).toBe(200);
      expect(logAuditEvent).toHaveBeenCalledWith({
        action: 'peskids_message_rejected',
        actor_id: 'supervisor-jane',
        tenant_slug: 'peskids',
        resource_id: 'msg-1',
        resource_type: 'peskids_message',
        metadata: {
          rejected_by: 'supervisor-jane',
          rejection_reason: 'Inappropriate content',
          request_id: 'req-5678',
          ip: '127.0.0.1',
        },
      });
    });
  });

  describe('GET /api/admin/peskids/[slug]/messages/pending', () => {
    it('returns 401/403 when requireAdminAccess denies access', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 })
      );
      const res = await pendingMessagesGET(
        new Request('http://localhost/api/admin/peskids/peskids/messages/pending'),
        { params: Promise.resolve({ slug: 'peskids' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 404 when slug is not peskids', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const res = await pendingMessagesGET(
        new Request('http://localhost/api/admin/peskids/other-slug/messages/pending'),
        { params: Promise.resolve({ slug: 'other-slug' }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/peskids/[slug]/followups/execute', () => {
    it('returns 401/403 when requireAdminAccess denies access', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 })
      );
      const res = await followupsExecutePOST(
        new Request('http://localhost/api/admin/peskids/peskids/followups/execute', {
          method: 'POST',
        }),
        { params: Promise.resolve({ slug: 'peskids' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 404 when slug is not peskids', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const res = await followupsExecutePOST(
        new Request('http://localhost/api/admin/peskids/other-slug/followups/execute', {
          method: 'POST',
        }),
        { params: Promise.resolve({ slug: 'other-slug' }) }
      );
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/admin/peskids/[slug]/followups/pending', () => {
    it('returns 401/403 when requireAdminAccess denies access', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(
        Response.json({ error: 'Unauthorized' }, { status: 401 })
      );
      const res = await pendingFollowupsGET(
        new Request('http://localhost/api/admin/peskids/peskids/followups/pending'),
        { params: Promise.resolve({ slug: 'peskids' }) }
      );
      expect(res.status).toBe(401);
    });

    it('returns 404 when slug is not peskids', async () => {
      vi.mocked(requireAdminAccess).mockResolvedValue(null);
      const res = await pendingFollowupsGET(
        new Request('http://localhost/api/admin/peskids/other-slug/followups/pending'),
        { params: Promise.resolve({ slug: 'other-slug' }) }
      );
      expect(res.status).toBe(404);
    });
  });
});
